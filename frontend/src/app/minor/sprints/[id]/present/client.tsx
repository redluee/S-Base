"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MinorSprintFull, MinorStoryType, MinorStory } from "@/lib/api";
import { SprintPresentation } from "@/components/minor-presentation/sprint-presentation";

interface SprintPresentClientProps {
  initialSprint: MinorSprintFull;
  initialStoryTypes: MinorStoryType[];
}

export function SprintPresentClient({ initialSprint, initialStoryTypes }: SprintPresentClientProps) {
  const router = useRouter();
  const [sprint, setSprint] = useState<MinorSprintFull>(initialSprint);
  const [storyTypes] = useState<MinorStoryType[]>(initialStoryTypes || []);

  function handleStoryUpdated(updatedStory: MinorStory) {
    setSprint((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => (s.id === updatedStory.id ? updatedStory : s)),
    }));
  }

  function handleClose() {
    router.push(`/minor/sprints/${sprint.id}`);
  }

  return (
    <SprintPresentation
      sprint={sprint}
      storyTypes={storyTypes}
      onClose={handleClose}
      onStoryUpdated={handleStoryUpdated}
    />
  );
}
