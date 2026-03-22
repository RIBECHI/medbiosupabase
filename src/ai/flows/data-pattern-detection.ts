'use server';

/**
 * @fileOverview A data pattern detection AI agent.
 *
 * - detectDataPatterns - A function that handles the data pattern detection process.
 * - DetectDataPatternsInput - The input type for the detectDataPatterns function.
 * - DetectDataPatternsOutput - The return type for the detectDataPatterns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectDataPatternsInputSchema = z.object({
  clientData: z.string().describe('The client data in JSON format.'),
  treatmentData: z.string().describe('The treatment data in JSON format.'),
});
export type DetectDataPatternsInput = z.infer<typeof DetectDataPatternsInputSchema>;

const DetectDataPatternsOutputSchema = z.object({
  patterns: z
    .string()
    .describe(
      'A summary of meaningful patterns detected in the client and treatment data.'
    ),
});
export type DetectDataPatternsOutput = z.infer<typeof DetectDataPatternsOutputSchema>;

export async function detectDataPatterns(
  input: DetectDataPatternsInput
): Promise<DetectDataPatternsOutput> {
  return detectDataPatternsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectDataPatternsPrompt',
  input: {schema: DetectDataPatternsInputSchema},
  output: {schema: DetectDataPatternsOutputSchema},
  prompt: `You are an expert data analyst specializing in detecting patterns in client and treatment data for aesthetics clinics.

You will analyze the provided client and treatment data to identify meaningful patterns, such as correlations between treatment types and client demographics.

Client Data: {{{clientData}}}
Treatment Data: {{{treatmentData}}}

Based on this data, provide a summary of the key patterns you have identified. Focus on insights that can inform marketing strategies and service offerings.
`,
});

const detectDataPatternsFlow = ai.defineFlow(
  {
    name: 'detectDataPatternsFlow',
    inputSchema: DetectDataPatternsInputSchema,
    outputSchema: DetectDataPatternsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
