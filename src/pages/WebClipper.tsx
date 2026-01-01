import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Note } from '@/types/note';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, ExternalLink } from 'lucide-react';

const WebClipper = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const title = searchParams.get('title') || 'Untitled Clip';
  const url = searchParams.get('url') || '';
  const content = searchParams.get('content') || '';
  const selection = searchParams.get('selection') || '';

  useEffect(() => {
    if (title || url || content || selection) {
      handleSaveClip();
    }
  }, []);

  const handleSaveClip = async () => {
    setSaving(true);

    try {
      // Build note content
      let noteContent = '';
      
      if (url) {
        noteContent += `**Source:** [${url}](${url})\n\n`;
      }
      
      if (selection) {
        noteContent += `> ${selection}\n\n`;
      }
      
      if (content) {
        noteContent += content;
      }

      // Create new note
      const newNote: Note = {
        id: crypto.randomUUID(),
        type: 'regular',
        title: title,
        content: noteContent,
        voiceRecordings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Get existing notes
      const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
      
      // Add new note
      const updatedNotes = [newNote, ...existingNotes];
      localStorage.setItem('notes', JSON.stringify(updatedNotes));

      setSaved(true);
      toast({
        title: 'Web clip saved!',
        description: `"${title}" has been saved to your notes.`,
      });

      // Redirect to notes after short delay
      setTimeout(() => {
        navigate('/notes');
      }, 1500);
    } catch (error) {
      console.error('Error saving clip:', error);
      toast({
        title: 'Error saving clip',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving clip...
              </>
            ) : saved ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                Clip saved!
              </>
            ) : (
              'Web Clipper'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(title || url) && (
            <div className="space-y-2">
              <p className="font-medium text-sm text-muted-foreground">Clipping:</p>
              <p className="font-semibold">{title}</p>
              {url && (
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {url.length > 50 ? url.substring(0, 50) + '...' : url}
                </a>
              )}
            </div>
          )}

          {selection && (
            <div className="space-y-2">
              <p className="font-medium text-sm text-muted-foreground">Selected text:</p>
              <blockquote className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">
                {selection.length > 200 ? selection.substring(0, 200) + '...' : selection}
              </blockquote>
            </div>
          )}

          {saved && (
            <Button 
              onClick={() => navigate('/notes')} 
              className="w-full"
            >
              View Notes
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebClipper;
