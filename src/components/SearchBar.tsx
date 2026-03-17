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
      className="glass-panel rounded-xl shadow-lg flex items-center gap-2 px-4 py-3 w-full max-w-xl transition-all focus-within:ring-2 focus-within:ring-primary/40"
    >
      <MapPin className="h-5 w-5 text-primary shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Įveskite sklypo kadastrinį arba unikalų numerį:"
        className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="premium-gradient text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isLoading ? (
          <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        Ieškoti
      </button>
    </form>
  );
};

export default SearchBar;
