import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

const LeaderboardPanel: React.FC = () => {
  const [rows, setRows] = useState<Array<{ display_name: string; amount: number; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.rpc('get_top_wagers', { limit_count: 20 });
      if (!mounted) return;
      if (error) {
        setRows([]);
      } else {
        setRows((data as any[])?.map(d => ({
          display_name: d.display_name ?? 'player',
          amount: Number(d.amount ?? 0),
          created_at: String(d.created_at ?? '')
        })) ?? []);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="bg-card/60 backdrop-blur border-border h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Top Wagers
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--success,140_70%_40%))] shadow-[0_0_0_3px_hsl(var(--success,140_70%_40%)/0.2)] pulse" aria-hidden />
          <span className="sr-only">Live</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No open matches yet.</div>
          ) : (
            <ul className="space-y-3">
              {rows.map((w, i) => (
                <li key={`${w.display_name}-${i}`} className="flex items-center justify-between rounded-md border bg-background/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">#{i + 1} • {w.display_name}</span>
                  <span className="font-semibold">{w.amount} SOL</span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LeaderboardPanel;
