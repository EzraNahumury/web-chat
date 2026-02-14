export type AppRole = "USER" | "ADMIN" | "FOUNDER";
export type MembershipStatus = "NONE" | "PENDING" | "ACTIVE" | "REJECTED";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  role: AppRole;
  membershipStatus: MembershipStatus;
  isActive?: boolean;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  sender: {
    id: string;
    username: string;
    role: AppRole;
  };
};

