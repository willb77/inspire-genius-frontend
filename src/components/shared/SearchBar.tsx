import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

export default function SearchBar({ 
  placeholder = "Search...", 
  onSearch 
}: SearchBarProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(e.target.value);
  };

  return (
    <div className="relative w-full sm:w-128">
      <input
        type="text"
        placeholder={placeholder}
        aria-label="Search"
        onChange={handleInputChange}
        disabled={true}
        className="w-full border bg-gray-20 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={20}
        strokeWidth={2}
      />
    </div>
  );
}
