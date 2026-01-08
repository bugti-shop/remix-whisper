import { useCallback, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
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
  Star,
  Paperclip,
  FileIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TableEditor, generateTableHTML } from './TableEditor';

// Favorites storage helpers
const FAVORITES_KEY = 'note-font-favorites';
const getFavorites = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};
const saveFavorites = (favorites: string[]) => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

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
  externalEditorRef?: React.RefObject<HTMLDivElement>;
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
  { name: 'Purple', value: '#E9D5FF' },
  { name: 'Red', value: '#FECACA' },
  { name: 'Cyan', value: '#A5F3FC' },
  { name: 'Lime', value: '#D9F99D' },
  { name: 'Rose', value: '#FECDD3' },
  { name: 'Amber', value: '#FDE68A' },
  { name: 'Teal', value: '#99F6E4' },
];

const FONT_CATEGORIES = [
  {
    category: 'Popular',
    fonts: [
      { name: 'Default', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', sample: 'Clean & Modern' },
      { name: 'Roboto', value: '"Roboto", sans-serif', sample: 'Most Popular' },
      { name: 'Open Sans', value: '"Open Sans", sans-serif', sample: 'Web Favorite' },
      { name: 'Lato', value: '"Lato", sans-serif', sample: 'Elegant Sans' },
      { name: 'Montserrat', value: '"Montserrat", sans-serif', sample: 'Bold & Modern' },
      { name: 'Poppins', value: '"Poppins", sans-serif', sample: 'Geometric Style' },
      { name: 'Playfair Display', value: '"Playfair Display", serif', sample: 'Classic Elegance' },
      { name: 'Dancing Script', value: '"Dancing Script", cursive', sample: 'Beautiful Script' },
    ]
  },
  {
    category: 'Sans Serif',
    fonts: [
      { name: 'Inter', value: '"Inter", sans-serif', sample: 'Modern UI Font' },
      { name: 'Raleway', value: '"Raleway", sans-serif', sample: 'Thin & Stylish' },
      { name: 'Nunito', value: '"Nunito", sans-serif', sample: 'Rounded & Friendly' },
      { name: 'Ubuntu', value: '"Ubuntu", sans-serif', sample: 'Tech Friendly' },
      { name: 'Quicksand', value: '"Quicksand", sans-serif', sample: 'Light & Airy' },
      { name: 'Josefin Sans', value: '"Josefin Sans", sans-serif', sample: 'Vintage Modern' },
      { name: 'Work Sans', value: '"Work Sans", sans-serif', sample: 'Professional' },
      { name: 'PT Sans', value: '"PT Sans", sans-serif', sample: 'Readable Sans' },
      { name: 'Cabin', value: '"Cabin", sans-serif', sample: 'Humanist Style' },
      { name: 'Oswald', value: '"Oswald", sans-serif', sample: 'CONDENSED STYLE' },
      { name: 'Archivo', value: '"Archivo", sans-serif', sample: 'Grotesque Sans' },
      { name: 'Rubik', value: '"Rubik", sans-serif', sample: 'Rounded Corners' },
      { name: 'Karla', value: '"Karla", sans-serif', sample: 'Grotesque Style' },
      { name: 'Mulish', value: '"Mulish", sans-serif', sample: 'Clean Reading' },
      { name: 'DM Sans', value: '"DM Sans", sans-serif', sample: 'Low Contrast' },
      { name: 'Manrope', value: '"Manrope", sans-serif', sample: 'Modern Geometric' },
      { name: 'Outfit', value: '"Outfit", sans-serif', sample: 'Variable Width' },
      { name: 'Lexend', value: '"Lexend", sans-serif', sample: 'Easy Reading' },
      { name: 'Figtree', value: '"Figtree", sans-serif', sample: 'Friendly Sans' },
      { name: 'Source Sans Pro', value: '"Source Sans Pro", sans-serif', sample: 'Adobe Classic' },
      { name: 'Noto Sans', value: '"Noto Sans", sans-serif', sample: 'Universal' },
      { name: 'Barlow', value: '"Barlow", sans-serif', sample: 'Slightly Rounded' },
      { name: 'Exo 2', value: '"Exo 2", sans-serif', sample: 'Geometric Tech' },
      { name: 'Titillium Web', value: '"Titillium Web", sans-serif', sample: 'Academic Style' },
    ]
  },
  {
    category: 'Serif',
    fonts: [
      { name: 'Merriweather', value: '"Merriweather", serif', sample: 'Reading Comfort' },
      { name: 'Crimson Text', value: '"Crimson Text", serif', sample: 'Book Typography' },
      { name: 'Noto Serif', value: '"Noto Serif", serif', sample: 'Classic Style' },
      { name: 'Lora', value: '"Lora", serif', sample: 'Contemporary Serif' },
      { name: 'Libre Baskerville', value: '"Libre Baskerville", serif', sample: 'Web Optimized' },
      { name: 'EB Garamond', value: '"EB Garamond", serif', sample: 'Old Style' },
      { name: 'Cormorant', value: '"Cormorant", serif', sample: 'Display Serif' },
      { name: 'Bitter', value: '"Bitter", serif', sample: 'Slab Serif' },
      { name: 'Spectral', value: '"Spectral", serif', sample: 'Screen Reading' },
      { name: 'PT Serif', value: '"PT Serif", serif', sample: 'Russian Serif' },
      { name: 'Vollkorn', value: '"Vollkorn", serif', sample: 'Body Text' },
      { name: 'Alegreya', value: '"Alegreya", serif', sample: 'Literary Style' },
    ]
  },
  {
    category: 'Handwritten',
    fonts: [
      { name: 'Pacifico', value: '"Pacifico", cursive', sample: 'Fun & Playful' },
      { name: 'Indie Flower', value: '"Indie Flower", cursive', sample: 'Hand Written' },
      { name: 'Shadows Into Light', value: '"Shadows Into Light", cursive', sample: 'Sketchy Notes' },
      { name: 'Permanent Marker', value: '"Permanent Marker", cursive', sample: 'Bold Marker' },
      { name: 'Caveat', value: '"Caveat", cursive', sample: 'Quick Notes' },
      { name: 'Satisfy', value: '"Satisfy", cursive', sample: 'Brush Script' },
      { name: 'Kalam', value: '"Kalam", cursive', sample: 'Handwritten Style' },
      { name: 'Patrick Hand', value: '"Patrick Hand", cursive', sample: 'Friendly Notes' },
      { name: 'Architects Daughter', value: '"Architects Daughter", cursive', sample: 'Blueprint Style' },
      { name: 'Amatic SC', value: '"Amatic SC", cursive', sample: 'CONDENSED HAND' },
      { name: 'Covered By Your Grace', value: '"Covered By Your Grace", cursive', sample: 'Casual Script' },
      { name: 'Gloria Hallelujah', value: '"Gloria Hallelujah", cursive', sample: 'Comic Hand' },
      { name: 'Handlee', value: '"Handlee", cursive', sample: 'Loose Handwriting' },
      { name: 'Just Another Hand', value: '"Just Another Hand", cursive', sample: 'Quick Scribble' },
      { name: 'Neucha', value: '"Neucha", cursive', sample: 'Russian Hand' },
      { name: 'Nothing You Could Do', value: '"Nothing You Could Do", cursive', sample: 'Casual Flow' },
      { name: 'Reenie Beanie', value: '"Reenie Beanie", cursive', sample: 'Quick Note' },
      { name: 'Rock Salt', value: '"Rock Salt", cursive', sample: 'Rough Marker' },
      { name: 'Schoolbell', value: '"Schoolbell", cursive', sample: 'Classroom Style' },
      { name: 'Waiting for the Sunrise', value: '"Waiting for the Sunrise", cursive', sample: 'Dreamy Script' },
      { name: 'Zeyada', value: '"Zeyada", cursive', sample: 'Artistic Hand' },
      { name: 'Homemade Apple', value: '"Homemade Apple", cursive', sample: 'Natural Writing' },
      { name: 'Loved by the King', value: '"Loved by the King", cursive', sample: 'Royal Script' },
      { name: 'La Belle Aurore', value: '"La Belle Aurore", cursive', sample: 'French Elegance' },
      { name: 'Sacramento', value: '"Sacramento", cursive', sample: 'Elegant Script' },
      { name: 'Great Vibes', value: '"Great Vibes", cursive', sample: 'Formal Script' },
      { name: 'Allura', value: '"Allura", cursive', sample: 'Wedding Style' },
      { name: 'Alex Brush', value: '"Alex Brush", cursive', sample: 'Brush Lettering' },
      { name: 'Tangerine', value: '"Tangerine", cursive', sample: 'Calligraphy' },
      { name: 'Yellowtail', value: '"Yellowtail", cursive', sample: 'Retro Script' },
      { name: 'Marck Script', value: '"Marck Script", cursive', sample: 'Casual Elegant' },
      { name: 'Courgette', value: '"Courgette", cursive', sample: 'Medium Weight' },
      { name: 'Cookie', value: '"Cookie", cursive', sample: 'Sweet Script' },
      { name: 'Damion', value: '"Damion", cursive', sample: 'Bold Script' },
      { name: 'Mr Dafoe', value: '"Mr Dafoe", cursive', sample: 'Signature Style' },
      { name: 'Niconne', value: '"Niconne", cursive', sample: 'Romantic' },
      { name: 'Norican', value: '"Norican", cursive', sample: 'Flowing Script' },
      { name: 'Pinyon Script', value: '"Pinyon Script", cursive', sample: 'Formal Cursive' },
      { name: 'Rouge Script', value: '"Rouge Script", cursive', sample: 'Vintage Hand' },
    ]
  },
  {
    category: 'Display & Decorative',
    fonts: [
      { name: 'Bebas Neue', value: '"Bebas Neue", cursive', sample: 'BOLD HEADLINES' },
      { name: 'Lobster', value: '"Lobster", cursive', sample: 'Retro Script' },
      { name: 'Righteous', value: '"Righteous", cursive', sample: 'Groovy Display' },
      { name: 'Alfa Slab One', value: '"Alfa Slab One", serif', sample: 'Heavy Slab' },
      { name: 'Fredoka One', value: '"Fredoka One", cursive', sample: 'Rounded Fun' },
      { name: 'Bangers', value: '"Bangers", cursive', sample: 'COMIC STYLE' },
      { name: 'Russo One', value: '"Russo One", sans-serif', sample: 'Sporty Bold' },
      { name: 'Bungee', value: '"Bungee", cursive', sample: 'VERTICAL DISPLAY' },
      { name: 'Passion One', value: '"Passion One", cursive', sample: 'BOLD IMPACT' },
      { name: 'Monoton', value: '"Monoton", cursive', sample: 'NEON STYLE' },
    ]
  },
  {
    category: 'Monospace',
    fonts: [
      { name: 'Courier Prime', value: '"Courier Prime", monospace', sample: 'const code = true;' },
      { name: 'Space Mono', value: '"Space Mono", monospace', sample: 'function() {}' },
      { name: 'Fira Code', value: '"Fira Code", monospace', sample: '=> !== ===' },
      { name: 'Source Code Pro', value: '"Source Code Pro", monospace', sample: 'console.log()' },
      { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace', sample: 'let x = 42;' },
      { name: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace', sample: 'import { }' },
      { name: 'Roboto Mono', value: '"Roboto Mono", monospace', sample: 'async await' },
      { name: 'Inconsolata', value: '"Inconsolata", monospace', sample: 'if (true) {}' },
    ]
  }
];

// Helper to get all fonts flattened
const getAllFonts = () => {
  return FONT_CATEGORIES.flatMap(cat => cat.fonts);
};

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
  externalEditorRef,
}: RichTextEditorProps) => {
  const internalEditorRef = useRef<HTMLDivElement>(null);
  const editorRef = externalEditorRef || internalEditorRef;
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSizePickerOpen, setFontSizePickerOpen] = useState(false);
  const [favoriteFonts, setFavoriteFonts] = useState<string[]>(() => getFavorites());

  const toggleFavorite = useCallback((fontValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteFonts(prev => {
      const newFavorites = prev.includes(fontValue)
        ? prev.filter(f => f !== fontValue)
        : [...prev, fontValue];
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }, []);
  
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
  const handleNumberedList = () => execCommand('insertOrderedList');

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

        // Insert image at cursor position with resizable wrapper
        if (editorRef.current) {
          editorRef.current.focus();

          // Create a wrapper div for the resizable image
          const wrapper = document.createElement('div');
          wrapper.className = 'resizable-image-wrapper';
          wrapper.contentEditable = 'false';
          wrapper.style.display = 'inline-block';
          wrapper.style.position = 'relative';
          wrapper.style.margin = '10px 0';
          wrapper.style.cursor = 'move';
          wrapper.setAttribute('data-image-width', '300');
          wrapper.setAttribute('data-image-x', '0');
          wrapper.setAttribute('data-image-y', '0');

          const img = document.createElement('img');
          img.src = imageUrl;
          img.style.width = '300px';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.borderRadius = '8px';
          img.style.pointerEvents = 'none';
          img.draggable = false;

          // Create resize handle
          const resizeHandle = document.createElement('div');
          resizeHandle.className = 'image-resize-handle';
          resizeHandle.style.position = 'absolute';
          resizeHandle.style.bottom = '-4px';
          resizeHandle.style.right = '-4px';
          resizeHandle.style.width = '16px';
          resizeHandle.style.height = '16px';
          resizeHandle.style.backgroundColor = 'hsl(var(--primary))';
          resizeHandle.style.borderRadius = '50%';
          resizeHandle.style.cursor = 'se-resize';
          resizeHandle.style.display = 'none';
          resizeHandle.style.zIndex = '10';

          // Create move handle
          const moveHandle = document.createElement('div');
          moveHandle.className = 'image-move-handle';
          moveHandle.style.position = 'absolute';
          moveHandle.style.top = '-4px';
          moveHandle.style.left = '-4px';
          moveHandle.style.width = '16px';
          moveHandle.style.height = '16px';
          moveHandle.style.backgroundColor = 'hsl(var(--primary))';
          moveHandle.style.borderRadius = '50%';
          moveHandle.style.cursor = 'grab';
          moveHandle.style.display = 'none';
          moveHandle.style.zIndex = '10';

          wrapper.appendChild(img);
          wrapper.appendChild(resizeHandle);
          wrapper.appendChild(moveHandle);

          // Show handles on click
          wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            // Hide all other handles
            document.querySelectorAll('.resizable-image-wrapper').forEach(w => {
              const handles = w.querySelectorAll('.image-resize-handle, .image-move-handle');
              handles.forEach(h => (h as HTMLElement).style.display = 'none');
              (w as HTMLElement).style.outline = 'none';
            });
            // Show this wrapper's handles
            resizeHandle.style.display = 'block';
            moveHandle.style.display = 'block';
            wrapper.style.outline = '2px solid hsl(var(--primary))';
            wrapper.style.outlineOffset = '2px';
          });

          // Resize functionality
          let isResizing = false;
          let startX = 0;
          let startWidth = 0;

          resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startWidth = img.offsetWidth;
            document.addEventListener('mousemove', onResizeMove);
            document.addEventListener('mouseup', onResizeEnd);
          });

          resizeHandle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            isResizing = true;
            startX = e.touches[0].clientX;
            startWidth = img.offsetWidth;
            document.addEventListener('touchmove', onResizeTouchMove);
            document.addEventListener('touchend', onResizeEnd);
          });

          const onResizeMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(50, Math.min(800, startWidth + deltaX));
            img.style.width = `${newWidth}px`;
            wrapper.setAttribute('data-image-width', String(newWidth));
          };

          const onResizeTouchMove = (e: TouchEvent) => {
            if (!isResizing) return;
            const deltaX = e.touches[0].clientX - startX;
            const newWidth = Math.max(50, Math.min(800, startWidth + deltaX));
            img.style.width = `${newWidth}px`;
            wrapper.setAttribute('data-image-width', String(newWidth));
          };

          const onResizeEnd = () => {
            isResizing = false;
            document.removeEventListener('mousemove', onResizeMove);
            document.removeEventListener('mouseup', onResizeEnd);
            document.removeEventListener('touchmove', onResizeTouchMove);
            document.removeEventListener('touchend', onResizeEnd);
            handleInput();
          };

          // Move functionality
          let isDragging = false;
          let dragStartX = 0;
          let dragStartY = 0;
          let initialX = 0;
          let initialY = 0;

          moveHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialX = parseInt(wrapper.getAttribute('data-image-x') || '0');
            initialY = parseInt(wrapper.getAttribute('data-image-y') || '0');
            moveHandle.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
          });

          moveHandle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            isDragging = true;
            dragStartX = e.touches[0].clientX;
            dragStartY = e.touches[0].clientY;
            initialX = parseInt(wrapper.getAttribute('data-image-x') || '0');
            initialY = parseInt(wrapper.getAttribute('data-image-y') || '0');
            document.addEventListener('touchmove', onDragTouchMove);
            document.addEventListener('touchend', onDragEnd);
          });

          const onDragMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            wrapper.style.transform = `translate(${newX}px, ${newY}px)`;
            wrapper.setAttribute('data-image-x', String(newX));
            wrapper.setAttribute('data-image-y', String(newY));
          };

          const onDragTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - dragStartX;
            const deltaY = e.touches[0].clientY - dragStartY;
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            wrapper.style.transform = `translate(${newX}px, ${newY}px)`;
            wrapper.setAttribute('data-image-x', String(newX));
            wrapper.setAttribute('data-image-y', String(newY));
          };

          const onDragEnd = () => {
            isDragging = false;
            moveHandle.style.cursor = 'grab';
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchmove', onDragTouchMove);
            document.removeEventListener('touchend', onDragEnd);
            handleInput();
          };

          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(wrapper);

            // Move cursor after image
            range.setStartAfter(wrapper);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            editorRef.current.appendChild(wrapper);
          }

          // Trigger onChange to save content
          handleInput();
          toast.success('Image added - click to resize or move');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file attachment upload (any file type)
  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileDataUrl = reader.result as string;

        if (editorRef.current) {
          editorRef.current.focus();

          // Create file attachment element
          const wrapper = document.createElement('div');
          wrapper.className = 'file-attachment-wrapper';
          wrapper.contentEditable = 'false';
          wrapper.style.display = 'inline-flex';
          wrapper.style.alignItems = 'center';
          wrapper.style.gap = '8px';
          wrapper.style.padding = '8px 12px';
          wrapper.style.margin = '8px 0';
          wrapper.style.backgroundColor = 'hsl(var(--muted))';
          wrapper.style.borderRadius = '8px';
          wrapper.style.border = '1px solid hsl(var(--border))';
          wrapper.style.maxWidth = '100%';
          wrapper.setAttribute('data-file-name', file.name);
          wrapper.setAttribute('data-file-type', file.type);
          wrapper.setAttribute('data-file-size', file.size.toString());

          // File icon
          const icon = document.createElement('div');
          icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
          icon.style.flexShrink = '0';
          icon.style.color = 'hsl(var(--primary))';

          // File info
          const info = document.createElement('div');
          info.style.overflow = 'hidden';
          
          const fileName = document.createElement('div');
          fileName.textContent = file.name;
          fileName.style.fontWeight = '500';
          fileName.style.fontSize = '14px';
          fileName.style.textOverflow = 'ellipsis';
          fileName.style.overflow = 'hidden';
          fileName.style.whiteSpace = 'nowrap';
          
          const fileSize = document.createElement('div');
          const sizeInKB = (file.size / 1024).toFixed(1);
          const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
          fileSize.textContent = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
          fileSize.style.fontSize = '12px';
          fileSize.style.color = 'hsl(var(--muted-foreground))';
          
          info.appendChild(fileName);
          info.appendChild(fileSize);

          // Download link (hidden but stores the data)
          const downloadLink = document.createElement('a');
          downloadLink.href = fileDataUrl;
          downloadLink.download = file.name;
          downloadLink.style.display = 'none';
          downloadLink.className = 'file-download-link';

          // Click handler to download
          wrapper.style.cursor = 'pointer';
          wrapper.onclick = (ev) => {
            ev.preventDefault();
            downloadLink.click();
          };

          wrapper.appendChild(icon);
          wrapper.appendChild(info);
          wrapper.appendChild(downloadLink);

          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            // Add line break before
            const br1 = document.createElement('br');
            range.insertNode(br1);
            range.setStartAfter(br1);
            
            range.insertNode(wrapper);

            // Add line break after and move cursor
            const br2 = document.createElement('br');
            range.setStartAfter(wrapper);
            range.insertNode(br2);
            range.setStartAfter(br2);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            editorRef.current.appendChild(document.createElement('br'));
            editorRef.current.appendChild(wrapper);
            editorRef.current.appendChild(document.createElement('br'));
          }

          handleInput();
          toast.success(`File "${file.name}" attached`);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  // Click outside to deselect images
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.resizable-image-wrapper')) {
        document.querySelectorAll('.resizable-image-wrapper').forEach(w => {
          const handles = w.querySelectorAll('.image-resize-handle, .image-move-handle');
          handles.forEach(h => (h as HTMLElement).style.display = 'none');
          (w as HTMLElement).style.outline = 'none';
        });
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-capitalize first letter of new sentences
  const autoCapitalize = useCallback((text: string): string => {
    // Capitalize after: start of text, period+space, newline, exclamation, question mark
    return text.replace(/(^|[.!?]\s+|\n)([a-z])/g, (match, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });
  }, []);

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

  // Handle keydown for auto-capitalization
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Auto-capitalize after sentence-ending punctuation followed by space
    if (e.key === ' ' && editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || '';
          const cursorPos = range.startOffset;
          // Check if previous char is sentence-ending punctuation
          if (cursorPos > 0 && /[.!?]/.test(text[cursorPos - 1])) {
            // The next character typed should be capitalized - handled by browser autocapitalize
          }
        }
      }
    }
  }, []);

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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleNumberedList}
        className="h-8 w-8 p-0"
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
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
          <div className="grid grid-cols-4 gap-2">
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Align Image"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const selectedImage = document.querySelector('.resizable-image-wrapper[style*="outline"]') as HTMLElement;
                    if (selectedImage) {
                      selectedImage.style.display = 'block';
                      selectedImage.style.marginLeft = '0';
                      selectedImage.style.marginRight = 'auto';
                      handleInput();
                      toast.success('Image aligned left');
                    } else {
                      toast.error('Please select an image first');
                    }
                  }}
                  className="h-8 w-8 p-0"
                  title="Align Left"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const selectedImage = document.querySelector('.resizable-image-wrapper[style*="outline"]') as HTMLElement;
                    if (selectedImage) {
                      selectedImage.style.display = 'block';
                      selectedImage.style.marginLeft = 'auto';
                      selectedImage.style.marginRight = 'auto';
                      handleInput();
                      toast.success('Image aligned center');
                    } else {
                      toast.error('Please select an image first');
                    }
                  }}
                  className="h-8 w-8 p-0"
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const selectedImage = document.querySelector('.resizable-image-wrapper[style*="outline"]') as HTMLElement;
                    if (selectedImage) {
                      selectedImage.style.display = 'block';
                      selectedImage.style.marginLeft = 'auto';
                      selectedImage.style.marginRight = '0';
                      handleInput();
                      toast.success('Image aligned right');
                    } else {
                      toast.error('Please select an image first');
                    }
                  }}
                  className="h-8 w-8 p-0"
                  title="Align Right"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* File Attachment Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => attachmentInputRef.current?.click()}
        className="h-8 w-8 p-0"
        title="Attach File"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

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
          <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto p-0 rounded-2xl shadow-xl border-0" sideOffset={8}>
            <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl">
              <h4 className="font-bold text-base text-foreground">Choose Font</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Tap star to add to favorites</p>
            </div>
            <div className="p-3 space-y-4">
              {/* Favorites Section */}
              {favoriteFonts.length > 0 && (
                <div>
                  <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-1 mb-2 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500" />
                    Favorites
                  </h5>
                  <div className="grid gap-1.5">
                    {getAllFonts()
                      .filter(font => favoriteFonts.includes(font.value))
                      .map((font) => {
                        const isSelected = fontFamily === font.value;
                        const isFavorite = true;
                        return (
                          <button
                            key={font.value}
                            onClick={() => {
                              onFontFamilyChange(font.value);
                              setFontPickerOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-3 rounded-xl transition-all duration-200 border-2 relative",
                              isSelected 
                                ? "bg-primary border-primary shadow-lg scale-[1.02]" 
                                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:border-amber-400"
                            )}
                          >
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(font.value, e)}
                              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                            >
                              <Star className={cn(
                                "h-4 w-4",
                                isFavorite ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                              )} />
                            </button>
                            <div className="flex items-center gap-2 pr-8">
                              <span className={cn(
                                "text-xs font-semibold",
                                isSelected ? "text-primary-foreground" : "text-foreground"
                              )}>
                                {font.name}
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                                  <span className="text-primary-foreground text-[10px]">✓</span>
                                </div>
                              )}
                            </div>
                            <p 
                              className={cn(
                                "text-base mt-1 leading-tight",
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
              )}

              {/* All Categories */}
              {FONT_CATEGORIES.map((category) => (
                <div key={category.category}>
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    {category.category}
                  </h5>
                  <div className="grid gap-1.5">
                    {category.fonts.map((font) => {
                      const isSelected = fontFamily === font.value;
                      const isFavorite = favoriteFonts.includes(font.value);
                      return (
                        <button
                          key={font.value}
                          onClick={() => {
                            onFontFamilyChange(font.value);
                            setFontPickerOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-3 rounded-xl transition-all duration-200 border-2 relative",
                            isSelected 
                              ? "bg-primary border-primary shadow-lg scale-[1.02]" 
                              : "bg-card border-transparent hover:border-primary/30 hover:bg-secondary/50"
                          )}
                        >
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(font.value, e)}
                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                          >
                            <Star className={cn(
                              "h-4 w-4 transition-all",
                              isFavorite ? "fill-amber-500 text-amber-500" : isSelected ? "text-primary-foreground/50" : "text-muted-foreground/40 hover:text-amber-400"
                            )} />
                          </button>
                          <div className="flex items-center gap-2 pr-8">
                            <span className={cn(
                              "text-xs font-semibold",
                              isSelected ? "text-primary-foreground" : "text-foreground"
                            )}>
                              {font.name}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                                <span className="text-primary-foreground text-[10px]">✓</span>
                              </div>
                            )}
                          </div>
                          <p 
                            className={cn(
                              "text-base mt-1 leading-tight",
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
          .rich-text-editor ol {
            list-style: decimal;
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
          autoCapitalize="sentences"
          style={{ fontFamily, color: isStickyNote ? '#000000' : undefined }}
        />
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />
      <input
        type="file"
        ref={attachmentInputRef}
        className="hidden"
        accept="*/*"
        onChange={handleFileAttachment}
      />

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
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
          fontStyle: isItalic ? 'italic' : 'normal',
          textTransform: 'none',
        }}
        // @ts-ignore - autocapitalize is valid HTML attribute
        autoCapitalize="sentences"
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
