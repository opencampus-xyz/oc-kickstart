import { Search } from "@mui/icons-material";
import { IconButton, TextField } from "@mui/material";

export const SearchBar = ({ handleSearch, searchText, setSearchText }) => {
  return (
    <TextField
      fullWidth
      label="Search"
      value={searchText ?? ""}
      onChange={(e) => setSearchText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleSearch();
        }
      }}
      slotProps={{
        input: {
          endAdornment: (
            <IconButton
              onClick={handleSearch}
              type="button"
              aria-label="search"
              size="small"
            >
              <Search />
            </IconButton>
          ),
        },
      }}
    />
  );
};
