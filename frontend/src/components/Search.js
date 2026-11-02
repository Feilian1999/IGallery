/* eslint-disable max-len */
import * as React from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import PropTypes from "prop-types";

/**
 * @return {FreeSolo} freesolo
 */
export default function FreeSolo({options, onSearch}) {
  return (

    <Autocomplete
      freeSolo
      id="artwork-search"
      disableClearable
      options={options}
      onInputChange={(_, value) => onSearch(value)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search Artwork"
          InputProps={{
            ...params.InputProps,
            type: "search",
          }}
        />
      )}
    />

  );
}

FreeSolo.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSearch: PropTypes.func.isRequired,
};
