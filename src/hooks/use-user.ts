import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export interface UserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  speciality?: string;
  permissions?: string[];
  fcm_token?: string | null;
  avatar_url?: string;
  avatar_blob_url?: string;
}

export function useUser() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isStale,
    isFetching,
    isError,
    error,
    refetch,
    failureCount,
    status,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      // Check if the user is authenticated
      const response = await fetch("http://localhost:3001/auth/session", {
        method: "POST",
        credentials: "include",
      });

      if (response.status === 401) {
        // User is not authenticated
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error fetching session: ${response.status} ${errorText}`,
        );
      }

      const data = await response.json();

      // If the user is authenticated, fetch the user profile

      const cachedUser = queryClient.getQueryData(["user"]);
      if (cachedUser) {
        return cachedUser;
      }

      if (data.user) {
        // Fetch the profile data
        const profileResponse = await fetch(
          `http://localhost:3001/user/${data.user.id}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        if (!profileResponse.ok) {
          throw new Error(
            `Error fetching user profile: ${profileResponse.statusText}`,
          );
        }

        const profileData = await profileResponse.json();

        // Fetch the avatar if it exists
        if (profileData.avatar_url) {
          const avatarResponse = await fetch(
            `http://localhost:3001/user/avatar/${data.user.id}?path=${encodeURIComponent(
              profileData.avatar_url,
            )}`,
            {
              method: "GET",
              credentials: "include",
            },
          );

          if (avatarResponse.ok) {
            const avatarBlob = await avatarResponse.blob();
            const avatarBlobUrl = URL.createObjectURL(avatarBlob);
            if (avatarBlobUrl) {
              profileData.avatar_blob_url = avatarBlobUrl;
            } else {
              profileData.avatar_blob_url = null;
            }
          }
        }

        return profileData;
      }

      return null;
    },
    // retry: false,
    staleTime: 0, // 5 minutes
    refetchOnMount: true,
  });

  const userId = user?.user_id;

  const updateProfileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      if (!newProfile.user_id) {
        throw new Error("No userId available");
      }

      const response = await fetch(
        `http://localhost:3001/user/${newProfile.user_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newProfile),
        },
      );

      if (!response.ok) {
        throw new Error(`Error updating user profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data[0];
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["user"], {
        ...user,
        ...updatedProfile,
      });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) {
        throw new Error("No userId available");
      }

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(
        `http://localhost:3001/user/avatar/${userId}`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Error uploading avatar image: ${response.statusText}`);
      }

      const data = await response.json();
      return data.avatar_url;
    },
    onSuccess: (avatarUrl) => {
      if (user) {
        queryClient.setQueryData(["user"], {
          ...user,
          avatar_url: avatarUrl,
        });
        queryClient.invalidateQueries({ queryKey: ["user"] });
      }
    },
  });

  const updateProfile = (newProfile: UserProfile) => {
    updateProfileMutation.mutateAsync(newProfile);
  };

  const uploadAvatar = (file: File) => {
    uploadAvatarMutation.mutateAsync(file);
  };

  return {
    user,
    isLoading,
    isStale,
    isFetching,
    isError,
    error,
    refetch,
    failureCount,
    status,
    updateProfile,
    uploadAvatar,
  };
}

export function useTopUsers() {

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["topUsers"],
    queryFn: async () => {
      // Fetch top users from your backend
      const response = await fetch("http://localhost:3001/stat/top_users", {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error fetching top users: ${response.status} ${errorText}`,
        );
      }

      const data = await response.json();

      // Fetch avatars for each user and augment the user data
      const updatedData = await Promise.all(
        data.map(async (profileData: UserProfile) => {
          if (profileData.avatar_url) {
            try {
              const avatarResponse = await fetch(
                `http://localhost:3001/user/avatar/${profileData.user_id}?path=${encodeURIComponent(
                  profileData.avatar_url,
                )}`,
                {
                  method: "GET",
                },
              );

              if (avatarResponse.ok) {
                const avatarBlob = await avatarResponse.blob();
                const avatarBlobUrl = URL.createObjectURL(avatarBlob);
                return {
                  ...profileData,
                  avatar_blob_url: avatarBlobUrl,
                };
              }
            } catch (error) {
              console.error(
                `Error fetching avatar for user ${profileData.user_id}:`,
                error,
              );
            }
          }

          return {
            ...profileData,
            avatar_blob_url: null,
          };
        }),
      );

      return updatedData;
    },
    staleTime: 1000 * 60 * 15, // 15 min
    refetchOnMount: true,
  });

  return {
    users,
    isLoading,
    error,
  };
}