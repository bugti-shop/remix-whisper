import { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  TextCursorInput,
  Link2,
  Table,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TableEditor, generateTableHTML } from './TableEditor';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageAdd?: (imageUrl: string) => void;
  allowImages?: boolean;
  showTable?: boolean;
  className?: string;
  toolbarPosition?: 'top' | 'bottom';
  title?: string;
  onTitleChange?: (title: string) => void;
  showTitle?: boolean;
  fontFamily?: string;
  onFontFamilyChange?: (fontFamily: string) => void;
  fontSize?: string;
  onFontSizeChange?: (fontSize: string) => void;
  fontWeight?: string;
  onFontWeightChange?: (fontWeight: string) => void;
  letterSpacing?: string;
  onLetterSpacingChange?: (letterSpacing: string) => void;
  isItalic?: boolean;
  onItalicChange?: (isItalic: boolean) => void;
  lineHeight?: string;
  onLineHeightChange?: (lineHeight: string) => void;
  onInsertNoteLink?: () => void;
}

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FEF08A' },
  { name: 'Green', value: '#BBF7D0' },
  { name: 'Blue', value: '#BFDBFE' },
  { name: 'Pink', value: '#FBCFE8' },
  { name: 'Orange', value: '#FED7AA' },
];

const FONT_CATEGORIES = [
  {
    category: 'Sans Serif',
    fonts: [
      { name: 'Default', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', sample: 'Clean & Modern' },
      { name: 'Inter', value: '"Inter", sans-serif', sample: 'The quick brown fox' },
      { name: 'Roboto', value: '"Roboto", sans-serif', sample: 'The quick brown fox' },
      { name: 'Open Sans', value: '"Open Sans", sans-serif', sample: 'The quick brown fox' },
      { name: 'Lato', value: '"Lato", sans-serif', sample: 'The quick brown fox' },
      { name: 'Montserrat', value: '"Montserrat", sans-serif', sample: 'Bold & Elegant' },
      { name: 'Poppins', value: '"Poppins", sans-serif', sample: 'Geometric Style' },
      { name: 'Raleway', value: '"Raleway", sans-serif', sample: 'Thin & Stylish' },
      { name: 'Nunito', value: '"Nunito", sans-serif', sample: 'Rounded & Friendly' },
      { name: 'Ubuntu', value: '"Ubuntu", sans-serif', sample: 'The quick brown fox' },
      { name: 'Quicksand', value: '"Quicksand", sans-serif', sample: 'Light & Airy' },
      { name: 'Josefin Sans', value: '"Josefin Sans", sans-serif', sample: 'Vintage Modern' },
      { name: 'Work Sans', value: '"Work Sans", sans-serif', sample: 'Professional' },
      { name: 'PT Sans', value: '"PT Sans", sans-serif', sample: 'The quick brown fox' },
      { name: 'Cabin', value: '"Cabin", sans-serif', sample: 'Humanist Style' },
      { name: 'Oswald', value: '"Oswald", sans-serif', sample: 'CONDENSED STYLE' },
      { name: 'Archivo', value: '"Archivo", sans-serif', sample: 'Grotesque Sans' },
    ]
  },
  {
    category: 'Serif',
    fonts: [
      { name: 'Playfair Display', value: '"Playfair Display", serif', sample: 'Elegant Headlines' },
      { name: 'Merriweather', value: '"Merriweather", serif', sample: 'Reading Comfort' },
      { name: 'Crimson Text', value: '"Crimson Text", serif', sample: 'Book Typography' },
      { name: 'Noto Serif', value: '"Noto Serif", serif', sample: 'Classic Style' },
    ]
  },
  {
    category: 'Display & Decorative',
    fonts: [
      { name: 'Bebas Neue', value: '"Bebas Neue", cursive', sample: 'BOLD HEADLINES' },
      { name: 'Dancing Script', value: '"Dancing Script", cursive', sample: 'Casual Elegance' },
      { name: 'Pacifico', value: '"Pacifico", cursive', sample: 'Fun & Playful' },
      { name: 'Indie Flower', value: '"Indie Flower", cursive', sample: 'Hand Written' },
      { name: 'Shadows Into Light', value: '"Shadows Into Light", cursive', sample: 'Sketchy Notes' },
      { name: 'Permanent Marker', value: '"Permanent Marker", cursive', sample: 'Bold Marker' },
    ]
  },
  {
    category: 'Monospace',
    fonts: [
      { name: 'Courier Prime', value: '"Courier Prime", monospace', sample: 'const code = true;' },
      { name: 'Space Mono', value: '"Space Mono", monospace', sample: 'function() {}' },
      { name: 'Fira Code', value: '"Fira Code", monospace', sample: '=> !== ===' },
      { name: 'Source Code Pro', value: '"Source Code Pro", monospace', sample: 'console.log()' },
    ]
  }
];

const FONT_WEIGHTS = [
  { name: 'Light', value: '300' },
  { name: 'Regular', value: '400' },
  { name: 'Medium', value: '500' },
  { name: 'Semi Bold', value: '600' },
  { name: 'Bold', value: '700' },
];

const FONT_SIZES = [
  { name: 'Extra Small', value: '12px' },
  { name: 'Small', value: '14px' },
  { name: 'Medium', value: '16px' },
  { name: 'Large', value: '20px' },
  { name: 'Extra Large', value: '24px' },
  { name: 'Huge', value: '32px' },
];

const LETTER_SPACINGS = [
  { name: 'Tight', value: '-0.05em', sample: 'Compressed' },
  { name: 'Normal', value: '0em', sample: 'Default spacing' },
  { name: 'Wide', value: '0.05em', sample: 'Slightly spaced' },
  { name: 'Wider', value: '0.1em', sample: 'More spacing' },
  { name: 'Widest', value: '0.2em', sample: 'Maximum space' },
];

const LINE_HEIGHTS = [
  { name: 'Compact', value: '1.2', sample: 'Tight lines' },
  { name: 'Normal', value: '1.5', sample: 'Default height' },
  { name: 'Relaxed', value: '1.75', sample: 'More breathing room' },
  { name: 'Loose', value: '2', sample: 'Double spaced' },
  { name: 'Extra Loose', value: '2.5', sample: 'Maximum space' },
];

export const RichTextEditor = ({
  content,
  onChange,
  onImageAdd,
  allowImages = true,
  showTable = true,
  className = '',
  toolbarPosition = 'top',
  title = '',
  onTitleChange,
  showTitle = false,
  fontFamily = FONT_CATEGORIES[0].fonts[0].value,
  onFontFamilyChange,
  fontSize = FONT_SIZES[2].value,
  onFontSizeChange,
  fontWeight = FONT_WEIGHTS[1].value,
  onFontWeightChange,
  letterSpacing = LETTER_SPACINGS[1].value,
  onLetterSpacingChange,
  isItalic = false,
  onItalicChange,
  lineHeight = LINE_HEIGHTS[1].value,
  onLineHeightChange,
  onInsertNoteLink,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSizePickerOpen, setFontSizePickerOpen] = useState(false);
  
  // Track if we're in a composition (IME/autocomplete) to prevent crashes on Android
  const isComposingRef = useRef(false);
  // Track if the last change came from user input to avoid unnecessary innerHTML updates
  const isUserInputRef = useRef(false);

  const execCommand = useCallback((command: string, value?: string) => {
    try {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      editorRef.current?.focus();
    } catch (error) {
      console.error('Error executing command:', command, error);
    }
  }, []);

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleBulletList = () => execCommand('insertUnorderedList');

  const handleTextColor = (color: string) => {
    execCommand('foreColor', color);
  };

  const handleHighlight = (color: string) => {
    execCommand('hiliteColor', color);
  };

  const handleLink = () => {
    if (linkUrl) {
      const selection = window.getSelection();
      if (savedRangeRef.current && selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(savedRangeRef.current);
        } catch (e) {
          // ignore
        }
      }
      const selectedText = selection?.toString();
      if (!selectedText) {
        toast.error('Please select text first');
        return;
      }
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
      toast.success('Link inserted');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;

        // Insert image at cursor position
        if (editorRef.current) {
          editorRef.current.focus();

          const img = document.createElement('img');
          img.src = imageUrl;
          img.style.maxWidth = '60%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.margin = '10px 0';
          img.style.borderRadius = '8px';

          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);

            // Move cursor after image
            range.setStartAfter(img);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            editorRef.current.appendChild(img);
          }

          // Trigger onChange to save content
          handleInput();
          toast.success('Image added');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInput = () => {
    try {
      if (editorRef.current) {
        // Mark that this change came from user input
        isUserInputRef.current = true;
        const newContent = editorRef.current.innerHTML;
        onChange(newContent);

        // Add to history (but not during composition to avoid flooding)
        if (!isComposingRef.current) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newContent);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      }
    } catch (error) {
      console.error('Error handling input:', error);
    }
  };

  // Handle composition events for Android/IME input
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    // Trigger input after composition ends to capture final content
    handleInput();
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousContent = history[newIndex];
      if (editorRef.current) {
        editorRef.current.innerHTML = previousContent;
        onChange(previousContent);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextContent = history[newIndex];
      if (editorRef.current) {
        editorRef.current.innerHTML = nextContent;
        onChange(nextContent);
      }
    }
  };

  const handleTextCase = (caseType: 'upper' | 'lower') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast.error('Please select text first');
      return;
    }

    const selectedText = selection.toString();
    if (!selectedText) {
      toast.error('Please select text first');
      return;
    }

    const convertedText = caseType === 'upper'
      ? selectedText.toUpperCase()
      : selectedText.toLowerCase();

    document.execCommand('insertText', false, convertedText);
    toast.success(`Text converted to ${caseType === 'upper' ? 'uppercase' : 'lowercase'}`);
  };

  const handleAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    const commands = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull',
    };
    execCommand(commands[alignment]);
  };

  const handleInsertTable = (rows: number, cols: number) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const tableHTML = generateTableHTML(rows, cols);
      document.execCommand('insertHTML', false, tableHTML);
      handleInput();
      toast.success('Table inserted');
    }
  };

  // Set content when it changes from external source (not user input)
  // This prevents crashes on Android by avoiding innerHTML manipulation during typing
  useEffect(() => {
    // Skip if the change came from user input or during composition
    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }
    
    // Don't update during composition (IME/autocomplete active)
    if (isComposingRef.current) {
      return;
    }
    
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      // Only update if editor is not focused to avoid cursor issues
      const isFocused = document.activeElement === editorRef.current;
      if (!isFocused) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [content]);

  // Adjust toolbar position when the on-screen keyboard appears using VisualViewport
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const setInset = () => {
      if (!vv) return;
      const bottomInset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      document.documentElement.style.setProperty('--keyboard-inset', `${bottomInset}px`);
    };
    setInset();
    if (vv) {
      vv.addEventListener('resize', setInset);
      vv.addEventListener('scroll', setInset);
    }
    return () => {
      if (vv) {
        vv.removeEventListener('resize', setInset);
        vv.removeEventListener('scroll', setInset);
      }
    };
  }, []);

  const isStickyNote = className?.includes('sticky-note-editor');

  const toolbar = (
    <div className={cn("flex flex-wrap gap-1 p-3", isStickyNote ? "bg-white" : "bg-background")}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleUndo}
        disabled={historyIndex <= 0}
        className="h-8 w-8 p-0"
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleRedo}
        disabled={historyIndex >= history.length - 1}
        className="h-8 w-8 p-0"
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <div className="w-px h-8 bg-border mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleBold}
        className="h-8 w-8 p-0"
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleItalic}
        className="h-8 w-8 p-0"
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleUnderline}
        className="h-8 w-8 p-0"
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleBulletList}
        className="h-8 w-8 p-0"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Text Color"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-3 gap-2">
            {COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleTextColor(color.value)}
                className="h-8 w-8 rounded border-2 border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-3 gap-2">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleHighlight(color.value)}
                className="h-8 w-8 rounded border-2 border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {allowImages && onImageAdd && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 p-0"
            title="Add Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </>
      )}

      {showTable && <TableEditor onInsertTable={handleInsertTable} />}

      <div className="w-px h-8 bg-border mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => handleAlignment('left')}
        className="h-8 w-8 p-0"
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => handleAlignment('center')}
        className="h-8 w-8 p-0"
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => handleAlignment('right')}
        className="h-8 w-8 p-0"
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => handleAlignment('justify')}
        className="h-8 w-8 p-0"
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <div className="w-px h-8 bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Text Case"
          >
            <Type className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleTextCase('upper')} size="sm">
              UPPERCASE
            </Button>
            <Button onClick={() => handleTextCase('lower')} size="sm">
              lowercase
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {onFontFamilyChange && (
        <Popover open={fontPickerOpen} onOpenChange={setFontPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Font Family"
            >
              <span className="text-xs font-semibold">Aa</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 max-h-[60vh] overflow-y-auto p-0 rounded-2xl shadow-xl border-0" sideOffset={8}>
            <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl">
              <h4 className="font-bold text-base text-foreground">Choose Font</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Select a font style for your note</p>
            </div>
            <div className="p-3 space-y-4">
              {FONT_CATEGORIES.map((category) => (
                <div key={category.category}>
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    {category.category}
                  </h5>
                  <div className="grid gap-1.5">
                    {category.fonts.map((font) => {
                      const isSelected = fontFamily === font.value;
                      return (
                        <button
                          key={font.value}
                          onClick={() => {
                            onFontFamilyChange(font.value);
                            setFontPickerOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-3 rounded-xl transition-all duration-200 border-2",
                            isSelected 
                              ? "bg-primary border-primary shadow-lg scale-[1.02]" 
                              : "bg-card border-transparent hover:border-primary/30 hover:bg-secondary/50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              "text-xs font-semibold",
                              isSelected ? "text-primary-foreground" : "text-foreground"
                            )}>
                              {font.name}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                                <span className="text-primary-foreground text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <p 
                            className={cn(
                              "text-base mt-1.5 leading-tight",
                              isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                            )}
                            style={{ fontFamily: font.value }}
                          >
                            {font.sample}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {onFontSizeChange && (
        <Popover open={fontSizePickerOpen} onOpenChange={setFontSizePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Font Size"
            >
              <TextCursorInput className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0 rounded-2xl shadow-xl border-0" sideOffset={8}>
            <div className="p-3 border-b bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl">
              <h4 className="font-bold text-sm text-foreground">Font Size</h4>
            </div>
            <div className="p-2 space-y-1">
              {FONT_SIZES.map((size) => {
                const isSelected = fontSize === size.value;
                return (
                  <button
                    key={size.value}
                    onClick={() => {
                      onFontSizeChange(size.value);
                      setFontSizePickerOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between",
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-secondary"
                    )}
                  >
                    <span style={{ fontSize: size.value }} className="font-medium">{size.name}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isSelected 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {size.value}
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

    </div>
  );

  return (
    <div className={cn("w-full h-full flex flex-col", isStickyNote && "sticky-note-editor")}>
      <style>
        {`
          .rich-text-editor a {
            color: #3B82F6;
            text-decoration: underline;
          }
          .rich-text-editor ul {
            list-style: disc;
            padding-left: 2rem;
          }
          /* Ensure smooth mobile scrolling inside the editor */
          .rich-text-editor__scroll {
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
            touch-action: pan-y;
          }
          .title-input {
            font-size: 1.5rem;
            font-weight: bold;
            border: none;
            outline: none;
            background: transparent;
            width: 100%;
            padding: 1rem 1rem 0.5rem 1rem;
          }
          .title-input::placeholder {
            color: rgba(0, 0, 0, 0.3);
          }
          /* Sticky note title should be black */
          .sticky-note-editor .title-input {
            color: #000000 !important;
          }
          /* Enhanced audio player styling */
          .audio-player-container {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 12px;
            padding: 12px;
          }
          .audio-player-container audio {
            width: 100%;
            height: 54px;
            border-radius: 8px;
          }
          .audio-player-container audio::-webkit-media-controls-panel {
            background: transparent;
          }
        `}
      </style>

      {toolbarPosition === 'top' && toolbar}

      {showTitle && onTitleChange && (
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Title"
          className="title-input"
          style={{ fontFamily, color: isStickyNote ? '#000000' : undefined }}
        />
      )}

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className={cn(
          "rich-text-editor flex-1 min-h-0 p-4 border-0 focus:outline-none overflow-y-auto pb-32 rich-text-editor__scroll",
          // Don't add pt-2 for lined notes - let CSS padding-top handle it
          showTitle && !className?.includes('lined-note') ? "pt-2" : "",
          className
        )}
        style={{
          paddingBottom: 'calc(8rem + var(--keyboard-inset, 0px))',
          fontFamily,
          fontSize,
          fontWeight,
          letterSpacing,
          // Don't override lineHeight for lined notes - let CSS handle it
          lineHeight: className?.includes('lined-note') ? undefined : lineHeight,
          fontStyle: isItalic ? 'italic' : 'normal'
        }}
        suppressContentEditableWarning
      />

      {toolbarPosition === 'bottom' && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + var(--keyboard-inset, 0px))' }}
        >
          {toolbar}
        </div>
      )}
    </div>
  );
};
