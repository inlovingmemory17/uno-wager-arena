import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const mockWagers = [
  { player: "damnbruh", amount: 5.0 },
  { player: "uno_master", amount: 3.2 },
  { player: "stacker", amount: 2.5 },
  { player: "cardshark", amount: 2.1 },
  { player: "sol_slinger", amount: 1.8 },
];

const LeaderboardPanel: React.FC = () => {
  return (
    <Card className="bg-card/60 backdrop-blur border-border h-full">
      <CardHeader>
        <CardTitle>Top Wagers</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          <ul className="space-y-3">
            {mockWagers.map((w, i) => (
              <li key={w.player} className="flex items-center justify-between rounded-md border bg-background/50 px-3 py-2">
                <span className="text-sm text-muted-foreground">#{i + 1} • {w.player}</span>
                <span className="font-semibold">{w.amount} SOL</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LeaderboardPanel;
