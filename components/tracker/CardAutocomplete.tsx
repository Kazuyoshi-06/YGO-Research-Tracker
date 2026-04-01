"use client";

import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import type { CardInfo } from "./types";

interface CardAutocompleteProps {
  value: CardInfo | null;
  onChange: (card: CardInfo) => void;
  autoOpen?: boolean;
  disabled?: boolean;
}

const FRAME_LABELS: Record<string, string> = {
  normal: "Normal",
  effect: "Effect",
  fusion: "Fusion",
  ritual: "Ritual",
  synchro: "Synchro",
  xyz: "Xyz",
  link: "Link",
  spell: "Spell",
  trap: "Trap",
  token: "Token",
};

export function CardAutocomplete({
  value,
  onChange,
  autoOpen = false,
  disabled = false,
}: CardAutocompleteProps) {
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/cards/search?q=${encodeURIComponent(query)}&limit=25`
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);

  const handleSelect = (card: CardInfo) => {
    onChange(card);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded text-left text-sm
                   hover:bg-surface-raised transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                   focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 bg-transparent border-0"
      >
        <span
          className={
            value ? "text-foreground truncate" : "text-muted-foreground/60"
          }
        >
          {value?.name ?? "Rechercher…"}
        </span>
        <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 border-border bg-popover shadow-xl"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nom de la carte…"
            value={query}
            onValueChange={setQuery}
            className="h-9 text-sm border-0 focus:ring-0"
          />
          <CommandList className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Recherche…
              </div>
            )}
            {!loading && query.trim() && results.length === 0 && (
              <CommandEmpty className="text-xs text-muted-foreground">
                Aucune carte trouvée
              </CommandEmpty>
            )}
            {!loading && !query.trim() && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Tapez un nom de carte
              </div>
            )}
            {results.map((card) => (
              <CommandItem
                key={card.id}
                value={String(card.id)}
                onSelect={() => handleSelect(card)}
                className="cursor-pointer text-sm flex items-center justify-between gap-2 px-3 py-2"
              >
                <span className="truncate flex-1">{card.name}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 font-mono">
                  {FRAME_LABELS[card.frameType] ?? card.frameType}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
