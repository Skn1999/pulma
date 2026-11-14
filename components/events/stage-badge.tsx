import { CircleCheck, Lock, PencilLine, DoorOpen, Clock, CircleX, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventStage, Participation } from "@/lib/types";
import { STAGE_LABEL } from "@/lib/participation";

const STAGE_ICON = { draft: PencilLine, open: DoorOpen, locked: Lock, done: CircleCheck } as const;

/** An event's stage as an icon plus a word, never colour alone. */
export function StageBadge({ stage }: { stage: EventStage }) {
  const Icon = STAGE_ICON[stage];
  return (
    <Badge variant={stage === "open" ? "default" : "outline"}>
      <Icon aria-hidden="true" /> {STAGE_LABEL[stage]}
    </Badge>
  );
}

const STATUS = {
  invited: { label: "Invited", Icon: Clock },
  confirmed: { label: "Confirmed", Icon: CircleCheck },
  declined: { label: "Declined", Icon: CircleX },
  withdrawn: { label: "Withdrawn", Icon: LogOut },
} as const;

export function ParticipationBadge({ status }: { status: Participation["status"] }) {
  const { label, Icon } = STATUS[status];
  return (
    <Badge variant={status === "confirmed" ? "default" : "outline"}>
      <Icon aria-hidden="true" /> {label}
    </Badge>
  );
}
