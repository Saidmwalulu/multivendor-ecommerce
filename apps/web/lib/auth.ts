import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "./axios";

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/auth/logout");
      return response.data;
    },

    onSuccess: async () => {
      // Remove cached authenticated-user data
      queryClient.removeQueries({
        queryKey: ["current-user"],
      });

      // Redirect to login
      router.push("/sign-in");

      // Optional: refresh server components/layouts
      router.refresh();
    },
  });
};