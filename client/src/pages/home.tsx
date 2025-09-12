import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Trip } from '@shared/schema';

// Import ethers v6
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Contract configuration
const CONTRACT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];

const CONTRACT_ADDRESS = "0xc68769c2f8e4e7ebf6810691632ce6a1b676c16d";

// Marketplace rewards
const REWARDS = [
  {
    id: 1,
    title: "15% off at Corner House Ice Cream",
    description: "Enjoy delicious ice cream with eco-friendly discount",
    cost: 50,
    partner: "Corner House",
  },
  {
    id: 2,
    title: "Free Coffee at Third Wave Coffee", 
    description: "Complimentary coffee for sustainable commuters",
    cost: 30,
    partner: "Third Wave Coffee",
  },
  {
    id: 3,
    title: "₹100 off Movie Tickets",
    description: "Discount on movie tickets at PVR Cinemas", 
    cost: 75,
    partner: "PVR Cinemas",
  },
  {
    id: 4,
    title: "20% off Organic Groceries",
    description: "Sustainable shopping at Nature's Basket",
    cost: 40,
    partner: "Nature's Basket",
  }
];

interface TripForm {
  mode: string;
  distance: string;
}

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripForm, setTripForm] = useState<TripForm>({
    mode: 'Walking',
    distance: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user trips
  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ['/api/trips', account],
    enabled: !!account
  });

  // Create trip mutation
  const createTrip = useMutation({
    mutationFn: async (tripData: { walletAddress: string; mode: string; distance: number; tokensEarned: number }) => {
      const response = await apiRequest('POST', '/api/trips', tripData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setBalance(prev => prev + data.tokensEarned);
      toast({
        title: "Trip logged!",
        description: `You've earned ${data.tokensEarned} GTN!`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log trip. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Calculate tokens based on transport mode and distance
  const calculateTokens = (mode: string, distance: number): number => {
    const rates: Record<string, number> = {
      'Walking': 1,
      'Cycling': 0.5,
      'Public Transport': 0.2
    };
    return Math.floor(rates[mode] * distance);
  };

  // Connect to MetaMask wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      setLoading(true);
      try {
        // Import ethers dynamically
        const { ethers } = await import('ethers');
        
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Switch to Sepolia testnet
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
          });
        } catch (switchError: any) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'SepoliaETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          }
        }
        
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setAccount(address);
        
        // Fetch balance from contract
        await fetchBalance(provider, address);
        
        toast({
          title: "Wallet connected successfully!",
          description: "You can now start logging trips.",
        });
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        toast({
          title: "Failed to connect wallet",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to use this app.",
        variant: "destructive",
      });
    }
  };

  // Fetch GTN balance from contract
  const fetchBalance = async (provider: any, address: string) => {
    try {
      const { ethers } = await import('ethers');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const balance = await contract.balanceOf(address);
      setBalance(parseInt(balance.toString()));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      // For demo purposes, set a mock balance if contract call fails
      setBalance(125);
    }
  };

  // Submit new trip
  const submitTrip = () => {
    if (!tripForm.distance || parseFloat(tripForm.distance) <= 0) {
      toast({
        title: "Invalid distance",
        description: "Please enter a valid distance.",
        variant: "destructive",
      });
      return;
    }

    const distance = parseFloat(tripForm.distance);
    const tokensEarned = calculateTokens(tripForm.mode, distance);
    
    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }
    
    createTrip.mutate({
      walletAddress: account,
      mode: tripForm.mode,
      distance,
      tokensEarned
    });

    setShowTripModal(false);
    setTripForm({ mode: 'Walking', distance: '' });
  };

  // Redeem reward
  const redeemReward = (reward: typeof REWARDS[0]) => {
    if (balance >= reward.cost) {
      setBalance(prev => prev - reward.cost);
      const couponCode = `BENGALURU-GREEN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      toast({
        title: "Success!",
        description: `Your coupon code is ${couponCode}`,
      });
    } else {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough GTN to redeem this reward.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">🌱</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">CarbonShift</h1>
            </div>
            
            {account ? (
              <div className="flex items-center space-x-4">
                <div className="bg-secondary px-3 py-1 rounded-lg">
                  <span className="text-sm font-medium text-secondary-foreground" data-testid="text-balance">
                    {balance} GTN
                  </span>
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-wallet">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-connect-wallet"
              >
                {loading && <div className="loading-spinner mr-2"></div>}
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!account ? (
          /* Welcome Screen */
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚴</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Welcome to CarbonShift
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Earn Green Tokens (GTN) for sustainable commuting choices. 
              Walk, cycle, or use public transport to make a positive impact!
            </p>
            <Button
              onClick={connectWallet}
              disabled={loading}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-get-started"
            >
              {loading && <div className="loading-spinner mr-2"></div>}
              {loading ? 'Connecting...' : 'Get Started'}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💚</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total GTN Balance</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-total-balance">{balance}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🚶</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Trips</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-trips">{trips.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🌍</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CO₂ Saved</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-co2-saved">
                        {trips.reduce((acc, trip) => acc + trip.distance * 0.5, 0).toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => setShowTripModal(true)}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                data-testid="button-log-trip"
              >
                🚴 Log New Trip
              </Button>
            </div>

            {/* Recent Trips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Recent Trips</CardTitle>
              </CardHeader>
              <CardContent>
                {trips.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🚶</span>
                    <p className="text-muted-foreground">No trips logged yet. Start your sustainable journey!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trips.slice(0, 5).map((trip, index) => (
                      <div key={trip.id} className="trip-card bg-secondary/30 p-4 rounded-lg border border-border/50" data-testid={`card-trip-${index}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                              {trip.mode === 'Walking' ? '🚶' : 
                               trip.mode === 'Cycling' ? '🚴' : '🚌'}
                            </span>
                            <div>
                              <p className="font-medium text-foreground">{trip.mode}</p>
                              <p className="text-sm text-muted-foreground">
                                {trip.distance} km • {new Date(trip.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">+{trip.tokensEarned} GTN</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Marketplace */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Rewards Marketplace</CardTitle>
                <p className="text-sm text-muted-foreground">Redeem your GTN tokens for exclusive rewards from Bengaluru partners</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {REWARDS.map((reward) => (
                    <Card key={reward.id} className="reward-card bg-background border border-border overflow-hidden" data-testid={`card-reward-${reward.id}`}>
                      <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <span className="text-4xl">
                          {reward.id === 1 ? '🍨' : 
                           reward.id === 2 ? '☕' : 
                           reward.id === 3 ? '🎬' : '🥬'}
                        </span>
                      </div>
                      <CardContent className="p-4">
                        <div className="mb-3">
                          <h4 className="font-semibold text-foreground text-sm mb-1">{reward.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{reward.description}</p>
                          <p className="text-xs text-accent font-medium">{reward.partner}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-primary">{reward.cost} GTN</span>
                          <Button
                            onClick={() => redeemReward(reward)}
                            disabled={balance < reward.cost}
                            size="sm"
                            className={balance >= reward.cost 
                              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }
                            data-testid={`button-redeem-${reward.id}`}
                          >
                            Redeem
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Trip Logging Modal */}
      <Dialog open={showTripModal} onOpenChange={setShowTripModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log New Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mode" className="block text-sm font-medium text-foreground mb-2">
                Transport Mode
              </Label>
              <Select value={tripForm.mode} onValueChange={(value) => setTripForm({...tripForm, mode: value})}>
                <SelectTrigger data-testid="select-transport-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Walking">🚶 Walking (1 GTN/km)</SelectItem>
                  <SelectItem value="Cycling">🚴 Cycling (0.5 GTN/km)</SelectItem>
                  <SelectItem value="Public Transport">🚌 Public Transport (0.2 GTN/km)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="distance" className="block text-sm font-medium text-foreground mb-2">
                Distance (km)
              </Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                min="0"
                value={tripForm.distance}
                onChange={(e) => setTripForm({...tripForm, distance: e.target.value})}
                placeholder="Enter distance in kilometers"
                data-testid="input-distance"
              />
            </div>
            {tripForm.distance && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-sm text-primary font-medium" data-testid="text-tokens-preview">
                  You'll earn {calculateTokens(tripForm.mode, parseFloat(tripForm.distance))} GTN tokens for this trip!
                </p>
              </div>
            )}
          </div>
          <div className="flex space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowTripModal(false)}
              className="flex-1"
              data-testid="button-cancel-trip"
            >
              Cancel
            </Button>
            <Button
              onClick={submitTrip}
              disabled={createTrip.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-submit-trip"
            >
              {createTrip.isPending ? 'Submitting...' : 'Submit Trip'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
