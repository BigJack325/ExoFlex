import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import React from "react";

interface GraphFiltersProps {
  setGraphType: React.Dispatch<React.SetStateAction<string>>;
  setIsGraphFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dropdownRef: React.RefObject<HTMLDivElement>;
}

const GraphFilters: React.FC<GraphFiltersProps> = ({
  setGraphType,
  setIsGraphFilterOpen,
  dropdownRef,
}) => {

  function changeGraphType(type: string) {
    setGraphType(type);
    setIsGraphFilterOpen(false);
  }

  return (
    <div ref={dropdownRef} className="flex z-30 w-min mt-2 absolute">
      <List className="bg-gray-600 rounded-md ml-4">
        <ListItem disablePadding>
          <ListItemButton onClick={() => changeGraphType("Amplitude")}>
            <ListItemText
              className="w-max"
              primary="Amplitude Graph"
            ></ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => changeGraphType("Rigidity")}>
            <ListItemText
              className="w-max"
              primary="Rigidity Graph"
            ></ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => changeGraphType("Number of repetitions")}
          >
            <ListItemText
              className="w-max"
              primary="Number of repetitions Graph"
            ></ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding></ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => changeGraphType("Feedback")}>
            <ListItemText
              className="w-max"
              primary="Feedback Graph"
            ></ListItemText>
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );
};

export default GraphFilters;
