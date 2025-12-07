"use client";
import { Avatar, AvatarProps } from "@whop/react/components";

interface UserAvatarProps extends AvatarProps {
  imageUrl?: string;
}

const UserAvatar = ({ imageUrl, ...props }: UserAvatarProps) => {
  return (
    <Avatar
      onLoadingStatusChange={function Xs() {}}
      src={imageUrl}
      {...props}
    />
  );
};

export default UserAvatar;
