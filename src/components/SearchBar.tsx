import { useState, FormEvent } from "react";
import { Search, MapPin } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const SearchBar = ({ onSearch, isLoading }: SearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel rounded-xl shadow-lg flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-3 w-full max-w-xl transition-all focus-within:ring-2 focus-within:ring-primary/40 overflow-hidden"
    >
      <MapPin className="h-5 w-5 text-primary shrink-0 hidden sm:block" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Įveskite sklypo kadastrinį arba unikalų numerį"
        className="flex-1 min-w-0 truncate bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm pl-2 sm:pl-0"
        style={{ fontSize: "16px" }}
        autoComplete="off"
        inputMode="text"
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        aria-label="Ieškoti" // Added so visually impaired users' screen readers still know what the button does
        className="premium-gradient shrink-0 text-primary-foreground rounded-lg p-2.5 sm:px-4 sm:py-2 text-sm font-medium flex items-center justify-center gap-0 sm:gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isLoading ? (
          <div className="h-5 w-5 sm:h-4 sm:w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin shrink-0" />
        ) : (
          <Search className="h-5 w-5 sm:h-4 sm:w-4 shrink-0" />
        )}
        {/* The text is now hidden on mobile, but visible on screens sm and larger */}
        <span className="hidden sm:inline">Ieškoti</span>
      </button>
    </form>
  );
};

export default SearchBar;
