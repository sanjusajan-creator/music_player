'use server';
/**
 * @fileOverview A Genkit flow for generating/finding lyrics for a music track.
 *
 * - generateLyrics - A function that provides lyrics for a given track.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LyricsInputSchema = z.object({
  title: z.string().describe('The title of the song.'),
  artist: z.string().describe('The artist of the song.'),
});

const LyricsOutputSchema = z.object({
  lyrics: z.string().describe('The formatted lyrics for the song.'),
  isInstrumental: z.boolean().describe('Whether the song is likely instrumental.'),
});

export async function generateLyrics(input: z.infer<typeof LyricsInputSchema>) {
  return generateLyricsFlow(input);
}

const lyricsPrompt = ai.definePrompt({
  name: 'lyricsPrompt',
  input: {schema: LyricsInputSchema},
  output: {schema: LyricsOutputSchema},
  prompt: `You are a premium music archive assistant. Provide the lyrics for the following song. 
If it is a real song, provide the actual lyrics. If it's an obscure track, generate high-quality poetic lyrics fitting the title and artist style.
Format the lyrics with line breaks.

Song Title: {{{title}}}
Artist: {{{artist}}}`,
});

const generateLyricsFlow = ai.defineFlow(
  {
    name: 'generateLyricsFlow',
    inputSchema: LyricsInputSchema,
    outputSchema: LyricsOutputSchema,
  },
  async (input) => {
    const {output} = await lyricsPrompt(input);
    return output!;
  }
);
