import ListIcon from "@mui/icons-material/List";
import SendIcon from "@mui/icons-material/Send";
import UserMenuDropdown from "./UserMenuDropdown.tsx";
import { useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Box, IconButton } from "@mui/material";
import { useUser } from "../hooks/use-user.ts";
import { useQueryClient } from "@tanstack/react-query";

interface UserListProps {
  listOfUsers: Array<{
    user_id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string;
  }>;
  setFilteredUsers: React.Dispatch<any>;
}

const UserList: React.FC<UserListProps> = ({
  listOfUsers,
  setFilteredUsers,
}) => {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { pathname } = useLocation();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const addToButtonRefs = (el: HTMLButtonElement | null, index: number) => {
    if (el) {
      buttonRefs.current[index] = el;
    }
  };

  const toggleDropdown = (index: number) => {
    setOpenMenuIndex(index === openMenuIndex ? null : index);
  };

  const sendInvitation = async (index: number) => {
    try {
      const response = await fetch("http://localhost:3001/notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender_id: user?.user_id,
          receiver_id: listOfUsers[index].user_id,
          user_name: `${user?.first_name} ${user?.last_name}`,
          image_url: user?.avatar_url,
          type: "relation",
          message: "sent a relation request",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send invitation: ${response.statusText}`);
      }

      const newList = listOfUsers.filter((_, i) => i !== index);
      setFilteredUsers(newList);
      queryClient.invalidateQueries(["pendingRelations"]);
      window.alert("Invitation sent successfully.");
    } catch (error) {
      console.error("Error sending invitation:", error);
    }
  };

  return (
    <div className="grid grid-cols-4 shadow-md shadow-gray-500 pt-2 bg-gray-300 rounded-2xl mx-4">
      <label
        className={
          "font-bold border-gray-400 text-black pl-2 pb-2" +
          (listOfUsers?.length > 0 ? " border-b-2" : "")
        }
      >
        First Name
      </label>
      <label
        className={
          "font-bold border-gray-400 text-black pl-2 pb-2" +
          (listOfUsers?.length ? " border-b-2" : "")
        }
      >
        Last Name
      </label>
      <label
        className={
          "font-bold border-gray-400 text-black pl-2 pb-2" +
          (listOfUsers?.length ? " border-b-2" : "")
        }
      >
        Email
      </label>
      <label
        className={
          "font-bold border-gray-400 text-black pl-2 pb-2" +
          (listOfUsers?.length ? " border-b-2" : "")
        }
      >
        Phone Number
      </label>

      <ul className="divide-y rounded-b-2xl col-span-4 divide-gray-400 bg-white">
        {listOfUsers?.slice(0, 10).map((user, index) => (
          <div key={index} className="grid grid-cols-4 items-center">
            <li className="text-black p-2">{user.first_name}</li>
            <li className="text-black p-2">{user.last_name}</li>
            <li className="text-black p-2">{user.email}</li>
            <div className="relative">
              <li className="text-black flex items-center justify-between p-2">
                <span>{user.phone_number}</span>
                <Box>
                  {pathname === "/network" ? (
                    <IconButton
                      sx={{
                        "&:hover": {
                          bgcolor: "#D1D5DB",
                        },
                      }}
                      ref={(el) => addToButtonRefs(el, index)}
                      onClick={() => toggleDropdown(index)}
                    >
                      <ListIcon color="primary" />
                    </IconButton>
                  ) : (
                    <IconButton
                      onClick={() => sendInvitation(index)}
                      sx={{
                        "&:hover": {
                          bgcolor: "#D1D5DB",
                        },
                      }}
                    >
                      <SendIcon color="success" />
                    </IconButton>
                  )}
                </Box>
              </li>
              {openMenuIndex === index && (
                <UserMenuDropdown
                  buttonRef={{ current: buttonRefs.current[index] }}
                  clientId={user.user_id}
                  setOpenMenuIndex={setOpenMenuIndex}
                />
              )}
            </div>
          </div>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
