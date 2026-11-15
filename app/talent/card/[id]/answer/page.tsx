import { redirect } from "next/navigation";

// Answering now happens on the problem page itself, next to the problem. Old links land on the form there.
export default async function AnswerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/talent/card/${id}#answer-h`);
}
