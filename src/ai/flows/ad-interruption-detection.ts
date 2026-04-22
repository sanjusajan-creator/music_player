'use server';
/**
 * @fileOverview A Genkit flow for detecting ad interruptions in video playback.
 *
 * - detectAdInterruption - A function that handles the ad interruption detection process.
 * - AdInterruptionDetectionInput - The input type for the detectAdInterruption function.
 * - AdInterruptionDetectionOutput - The return type for the detectAdInterruption function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const AdInterruptionDetectionInputSchema = z.object({
  expectedTrackDurationSeconds: z.number().describe('The expected duration of the actual music track in seconds.'),
  currentVideoDurationSeconds: z.number().describe('The reported duration of the video currently loaded in the player in seconds.'),
  currentPlaybackTimeSeconds: z.number().describe('The current playback position of the video in seconds.'),
  playerState: z.enum(['UNSTARTED', 'ENDED', 'PLAYING', 'PAUSED', 'BUFFERING', 'CUED']).describe('The current state of the YouTube player.'),
  recentBufferingCount: z.number().optional().describe('The number of buffering events observed in the last few seconds (e.g., 5 seconds). A higher number suggests instability.'),
  hasSuddenVolumeChange: z.boolean().optional().describe('True if the client detected a sudden and significant change in audio volume.'),
  hasAbnormalPlaybackSpeed: z.boolean().optional().describe('True if the client detected an abnormal playback speed (e.g., not 1x).'),
  playerQuality: z.string().optional().describe('The current playback quality reported by the player.'),
});
export type AdInterruptionDetectionInput = z.infer<typeof AdInterruptionDetectionInputSchema>;

// Output Schema
const AdInterruptionDetectionOutputSchema = z.object({
  isAdDetected: z.boolean().describe('True if the provided data strongly suggests an advertisement is currently playing.'),
  reasoning: z.string().describe('A brief explanation of why an ad was detected or not detected.'),
  confidence: z.number().min(0).max(1).optional().describe('A confidence score (0-1) for the ad detection.'),
});
export type AdInterruptionDetectionOutput = z.infer<typeof AdInterruptionDetectionOutputSchema>;

// Prompt definition
const adDetectionPrompt = ai.definePrompt({
  name: 'adDetectionPrompt',
  input: {schema: AdInterruptionDetectionInputSchema},
  output: {schema: AdInterruptionDetectionOutputSchema},
  prompt: `You are an intelligent ad detection system for a premium music player. Your goal is to analyze real-time playback data from a YouTube player and determine if the current content is likely an advertisement.

Consider the following as strong indicators of an advertisement:
-   The 'currentVideoDurationSeconds' is significantly shorter than the 'expectedTrackDurationSeconds' (e.g., less than 30 seconds for a music track).
-   The 'currentPlaybackTimeSeconds' is very low (e.g., less than 5 seconds) when duration anomalies are present.
-   Frequent 'recentBufferingCount' in combination with other anomalies.
-   'hasSuddenVolumeChange' is true.
-   'hasAbnormalPlaybackSpeed' is true.
-   The 'playerState' is 'BUFFERING' frequently and not resolving.

Analyze the provided input data to make your determination. Provide a boolean indicating if an ad is detected, a brief reasoning, and a confidence score.

Input Data:
Expected Track Duration: {{{expectedTrackDurationSeconds}}} seconds
Current Video Duration: {{{currentVideoDurationSeconds}}} seconds
Current Playback Time: {{{currentPlaybackTimeSeconds}}} seconds
Player State: {{{playerState}}}
Recent Buffering Events Count: {{{recentBufferingCount}}}
Has Sudden Volume Change: {{{hasSuddenVolumeChange}}}
Has Abnormal Playback Speed: {{{hasAbnormalPlaybackSpeed}}}
Player Quality: {{{playerQuality}}}`,
});

// Flow definition
const adInterruptionDetectionFlow = ai.defineFlow(
  {
    name: 'adInterruptionDetectionFlow',
    inputSchema: AdInterruptionDetectionInputSchema,
    outputSchema: AdInterruptionDetectionOutputSchema,
  },
  async (input) => {
    const {output} = await adDetectionPrompt(input);
    return output!;
  }
);

// Wrapper function
export async function detectAdInterruption(input: AdInterruptionDetectionInput): Promise<AdInterruptionDetectionOutput> {
  return adInterruptionDetectionFlow(input);
}
