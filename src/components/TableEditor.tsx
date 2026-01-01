import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, Plus, Minus, Trash2 } from 'lucide-react';

interface TableEditorProps {
  onInsertTable: (rows: number, cols: number) => void;
}

export const TableEditor = ({ onInsertTable }: TableEditorProps) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [isOpen, setIsOpen] = useState(false);

  const handleInsert = () => {
    onInsertTable(rows, cols);
    setIsOpen(false);
    setRows(3);
    setCols(3);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Insert Table"
        >
          <Table className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-4" align="start">
        <div className="space-y-4">
          <div className="font-medium text-sm">Insert Table</div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Rows</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setRows(Math.max(1, rows - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{rows}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setRows(Math.min(20, rows + 1))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">Columns</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setCols(Math.max(1, cols - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{cols}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => setCols(Math.min(10, cols + 1))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Grid preview */}
          <div className="border rounded p-2 bg-muted/30">
            <div 
              className="grid gap-0.5"
              style={{ 
                gridTemplateColumns: `repeat(${Math.min(cols, 6)}, 1fr)`,
              }}
            >
              {Array.from({ length: Math.min(rows, 5) * Math.min(cols, 6) }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-primary/20 rounded-sm min-w-[12px]"
                />
              ))}
            </div>
            {(rows > 5 || cols > 6) && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {rows}×{cols} table
              </p>
            )}
          </div>

          <Button onClick={handleInsert} className="w-full" size="sm">
            Insert Table
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Helper to generate table HTML
export const generateTableHTML = (rows: number, cols: number): string => {
  const headerRow = `<tr>${Array(cols).fill('<th style="border: 1px solid #d1d5db; padding: 8px; background: #f3f4f6; font-weight: 600;">Header</th>').join('')}</tr>`;
  const bodyRows = Array(rows - 1)
    .fill(null)
    .map(() => `<tr>${Array(cols).fill('<td style="border: 1px solid #d1d5db; padding: 8px;">Cell</td>').join('')}</tr>`)
    .join('');
  
  return `<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">${headerRow}${bodyRows}</table><p><br></p>`;
};

// Table manipulation functions
export const addTableRow = (table: HTMLTableElement, position: 'above' | 'below', rowIndex: number): void => {
  const newRow = table.insertRow(position === 'above' ? rowIndex : rowIndex + 1);
  const cellCount = table.rows[0]?.cells.length || 1;
  
  for (let i = 0; i < cellCount; i++) {
    const cell = newRow.insertCell(i);
    cell.style.border = '1px solid #d1d5db';
    cell.style.padding = '8px';
    cell.textContent = 'Cell';
  }
};

export const addTableColumn = (table: HTMLTableElement, position: 'left' | 'right', colIndex: number): void => {
  Array.from(table.rows).forEach((row, rowIdx) => {
    const cell = row.insertCell(position === 'left' ? colIndex : colIndex + 1);
    cell.style.border = '1px solid #d1d5db';
    cell.style.padding = '8px';
    
    if (rowIdx === 0) {
      cell.style.background = '#f3f4f6';
      cell.style.fontWeight = '600';
      cell.textContent = 'Header';
    } else {
      cell.textContent = 'Cell';
    }
  });
};

export const deleteTableRow = (table: HTMLTableElement, rowIndex: number): void => {
  if (table.rows.length > 1) {
    table.deleteRow(rowIndex);
  }
};

export const deleteTableColumn = (table: HTMLTableElement, colIndex: number): void => {
  if (table.rows[0]?.cells.length > 1) {
    Array.from(table.rows).forEach(row => {
      if (row.cells[colIndex]) {
        row.deleteCell(colIndex);
      }
    });
  }
};
