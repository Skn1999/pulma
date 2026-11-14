"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CalendarRange, ChevronDown, CircleCheck, CirclePause, CirclePlay, FileText, Target } from "lucide-react";
import type { CardState, HiringGoal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditGoal } from "./edit-goal";
import { EditEvent } from "./edit-event";
import { StatusDialog, setProblemState } from "./problem-status";
import type { EventChoice } from "./event-select";

type DialogKind = "paused" | "filled" | "goal" | "event" | null;

/** Every action on a problem behind one "More actions" menu, so the header stays calm. Dialogs mount only while open. */
export function ProblemActions({
  cardId, state, goal, eventId, events, eventLocked, onViewCard,
}: {
  cardId: string;
  state: CardState;
  goal: HiringGoal;
  eventId: string;
  events: EventChoice[];
  eventLocked: boolean;
  onViewCard: () => void;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const close = () => setDialog(null);

  async function reopen() {
    const err = await setProblemState(cardId, "open");
    if (err) return void toast.error(err);
    toast.success("Problem reopened. Everyone who answered has been told.");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          More actions <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>This problem</DropdownMenuLabel>
            <DropdownMenuItem onClick={onViewCard}>
              <FileText aria-hidden="true" /> View problem card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog("goal")}>
              <Target aria-hidden="true" /> Edit goal…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog("event")}>
              <CalendarRange aria-hidden="true" /> Change event…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/event?event=${eventId}`)}>
              <CalendarDays aria-hidden="true" /> Event day schedule
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {state !== "open" && (
              <DropdownMenuItem onClick={() => void reopen()}>
                <CirclePlay aria-hidden="true" /> Reopen
              </DropdownMenuItem>
            )}
            {state !== "paused" && (
              <DropdownMenuItem onClick={() => setDialog("paused")}>
                <CirclePause aria-hidden="true" /> Pause…
              </DropdownMenuItem>
            )}
            {state !== "filled" && (
              <DropdownMenuItem onClick={() => setDialog("filled")}>
                <CircleCheck aria-hidden="true" /> Mark as filled…
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {(dialog === "paused" || dialog === "filled") && <StatusDialog cardId={cardId} target={dialog} onClose={close} />}
      {dialog === "goal" && <EditGoal cardId={cardId} goal={goal} onClose={close} />}
      {dialog === "event" && <EditEvent cardId={cardId} eventId={eventId} events={events} locked={eventLocked} onClose={close} />}
    </>
  );
}
