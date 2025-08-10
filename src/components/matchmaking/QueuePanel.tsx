import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Stake tiers labeled in USD but using SOL balances internally.
// For MVP we map $1/$5/$10 to fixed SOL stakes. Adjust later if needed.
const USD_TO_SOL_MAP: Record<number, number> = {
  1: 0.01,
  5: 0.05,
  10: 0.1,
};

const QueuePanel: React.FC = () => {
  const navigate = useNavigate();
  const [usdStake, setUsdStake] = useState<1 | 5 | 10>(1);
  const [isQueueing, setIsQueueing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const solStake = useMemo(() => USD_TO_SOL_MAP[usdStake], [usdStake]);

  useEffect(() => {
    if (!isQueueing) return;
    setSecondsLeft(30);
    const i = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(i);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [isQueueing]);

  const lockStake = async (_amount: number) => {
    // Test mode: skip balance checks/locking
    return true;
  };

  const handleQueue = async () => {
    setIsQueueing(true);
    toast.info(`Queued for $${usdStake} match (≈ ${solStake} SOL). Test mode: no SOL required.`);
  };

  const handlePlayBot = async () => {
    if (!isQueueing) return;
    navigate(`/game/bot?stake=${solStake}&usd=${usdStake}`);
  };

  const cancelQueue = async () => {
    setIsQueueing(false);
    toast("Queue canceled");
  };

  return (
    <Card className="bg-card/60 backdrop-blur border-border h-full">
      <CardHeader>
        <CardTitle>Matchmaking</CardTitle>
        <CardDescription>Select a stake and join the queue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {[1, 5, 10].map((v) => (
            <Button
              key={v}
              variant={usdStake === v ? "neon" : "secondary"}
              onClick={() => !isQueueing && setUsdStake(v as 1 | 5 | 10)}
            >
              ${v}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Test mode: no SOL required. Current stake: ~{solStake} SOL
        </p>
        {isQueueing && (
          <div className="text-sm text-muted-foreground">Time left: {secondsLeft}s</div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        {!isQueueing ? (
          <Button variant="neon" className="w-full sm:w-auto" onClick={handleQueue}>
            Queue for ${usdStake}
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button variant="secondary" className="flex-1" onClick={cancelQueue}>
              Cancel
            </Button>
            <Button
              variant="neon"
              className="flex-1"
              onClick={handlePlayBot}
              disabled={secondsLeft > 0}
            >
              Play against bot
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default QueuePanel;
