
'use server';
/**
 * @fileOverview A Genkit flow for generating a "Magic Playlist" from a user prompt.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MagicPlaylistInputSchema = z.object({
  prompt: z.string().describe('The user prompt for the mood or style of music they want.'),
});

const MagicPlaylistOutputSchema = z.object({
  playlistName: z.string(),
  description: z.string(),
  suggestedTracks: z.array(z.object({
    title: z.string(),
    artist: z.string(),
  })).describe('A list of tracks that fit the prompt.'),
});

export async function generateMagicPlaylist(input: z.infer<typeof MagicPlaylistInputSchema>) {
  return magicPlaylistFlow(input);
}

const magicPlaylistPrompt = ai.definePrompt({
  name: 'magicPlaylistPrompt',
  input: {schema: MagicPlaylistInputSchema},
  output: {schema: MagicPlaylistOutputSchema},
  prompt: `You are a professional music curator. Based on the following prompt, create a themed playlist.
Provide a catchy name, a brief description, and 10 real songs (title and artist) that perfectly match the vibe.

User Prompt: {{{prompt}}}`,
});

const magicPlaylistFlow = ai.defineFlow(
  {
    name: 'magicPlaylistFlow',
    inputSchema: MagicPlaylistInputSchema,
    outputSchema: MagicPlaylistOutputSchema,
  },
  async (input) => {
    const {output} = await magicPlaylistPrompt(input);
    return output!;
  }
);
