'use server';

/**
 * @fileOverview A treatment plan recommendation AI agent.
 *
 * - treatmentPlanRecommendations - A function that suggests adjustments to treatment plans based on client progress and feedback.
 * - TreatmentPlanRecommendationsInput - The input type for the treatmentPlanRecommendations function.
 * - TreatmentPlanRecommendationsOutput - The return type for the treatmentPlanRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TreatmentPlanRecommendationsInputSchema = z.object({
  clientProgress: z.string().describe('Description of the client progress.'),
  clientFeedback: z.string().describe('The feedback from the client regarding the treatment plan.'),
  currentTreatmentPlan: z.string().describe('The current treatment plan details.'),
});
export type TreatmentPlanRecommendationsInput = z.infer<typeof TreatmentPlanRecommendationsInputSchema>;

const TreatmentPlanRecommendationsOutputSchema = z.object({
  suggestedAdjustments: z.string().describe('Suggested adjustments to the treatment plan based on client progress and feedback.'),
  rationale: z.string().describe('The rationale behind the suggested adjustments.'),
});
export type TreatmentPlanRecommendationsOutput = z.infer<typeof TreatmentPlanRecommendationsOutputSchema>;

export async function treatmentPlanRecommendations(input: TreatmentPlanRecommendationsInput): Promise<TreatmentPlanRecommendationsOutput> {
  return treatmentPlanRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'treatmentPlanRecommendationsPrompt',
  input: {schema: TreatmentPlanRecommendationsInputSchema},
  output: {schema: TreatmentPlanRecommendationsOutputSchema},
  prompt: `You are an expert aesthetic treatment planner.

  Based on the client's progress, their feedback, and the current treatment plan, suggest adjustments to optimize treatment effectiveness and client satisfaction.

  Client Progress: {{{clientProgress}}}
  Client Feedback: {{{clientFeedback}}}
  Current Treatment Plan: {{{currentTreatmentPlan}}}

  Provide specific, actionable adjustments and explain the rationale behind each suggestion.
  `,
});

const treatmentPlanRecommendationsFlow = ai.defineFlow(
  {
    name: 'treatmentPlanRecommendationsFlow',
    inputSchema: TreatmentPlanRecommendationsInputSchema,
    outputSchema: TreatmentPlanRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
