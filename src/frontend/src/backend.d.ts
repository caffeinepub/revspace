import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface EventView {
    id: string;
    coverImageUrl: string;
    title: string;
    creator: Principal;
    maxAttendees: bigint;
    description: string;
    attendees: Array<Principal>;
    category: string;
    location: string;
    eventDate: bigint;
    photos: Array<string>;
}
export interface ProfileWithPrincipal {
    principal: Principal;
    profile: Profile;
}
export interface Comment {
    id: string;
    content: string;
    author: Principal;
    timestamp: bigint;
    postId: string;
}
export interface UserWithRole {
    principal: Principal;
    role: UserRole;
}
export interface Listing {
    id: string;
    title: string;
    imageUrls: Array<string>;
    description: string;
    isSold: boolean;
    seller: Principal;
    category: string;
    price: bigint;
    location: string;
    condition: string;
}
export interface PostView {
    id: string;
    postType: string;
    topic: string;
    content: string;
    author: Principal;
    likes: Array<Principal>;
    timestamp: bigint;
    mediaUrls: Array<string>;
    comments: Array<string>;
}
export interface ClubView {
    id: string;
    coverImageUrl: string;
    creator: Principal;
    members: Array<Principal>;
    name: string;
    description: string;
    category: string;
}
export interface Profile {
    bio: string;
    displayName: string;
    avatarUrl: string;
    bannerUrl: string;
    location: string;
}
export interface Notification {
    id: string;
    notifType: string;
    user: Principal;
    isRead: boolean;
    message: string;
    timestamp: bigint;
    relatedId: string;
}
export interface Message {
    id: string;
    content: string;
    sender: Principal;
    timestamp: bigint;
    receiver: Principal;
}
export interface Car {
    id: string;
    model: string;
    imageUrls: Array<string>;
    owner: Principal;
    make: string;
    color: string;
    year: string;
    description: string;
    modifications: Array<string>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCar(make: string, model: string, year: string, color: string, description: string, modifications: Array<string>, imageUrls: Array<string>): Promise<string>;
    addComment(postId: string, content: string): Promise<string>;
    addEventPhoto(eventId: string, photoUrl: string): Promise<void>;
    adminBanUser(user: Principal): Promise<void>;
    adminDeleteListing(listingId: string): Promise<void>;
    adminDeletePost(postId: string): Promise<void>;
    adminDeleteProfile(user: Principal): Promise<void>;
    adminGetAllProfiles(): Promise<Array<ProfileWithPrincipal>>;
    adminGetAllUsers(): Promise<Array<UserWithRole>>;
    adminUnbanUser(user: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createClub(name: string, description: string, category: string, coverImageUrl: string): Promise<string>;
    createEvent(title: string, description: string, location: string, eventDate: bigint, coverImageUrl: string, category: string, maxAttendees: bigint): Promise<string>;
    createListing(title: string, description: string, price: bigint, category: string, condition: string, imageUrls: Array<string>, location: string): Promise<string>;
    createNotification(notifType: string, message: string, relatedId: string): Promise<string>;
    createPost(content: string, mediaUrls: Array<string>, postType: string, topic: string): Promise<string>;
    deleteEvent(eventId: string): Promise<void>;
    deleteListing(listingId: string): Promise<void>;
    deletePost(postId: string): Promise<void>;
    followUser(user: Principal): Promise<void>;
    getAllPosts(): Promise<Array<PostView>>;
    getCallerUserProfile(): Promise<Profile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getClubMembers(clubId: string): Promise<Array<Principal>>;
    getCommentsForPost(postId: string): Promise<Array<Comment>>;
    getConversations(): Promise<Array<Principal>>;
    getEventAttendees(eventId: string): Promise<Array<Principal>>;
    getEventPhotos(eventId: string): Promise<Array<string>>;
    getFollowers(user: Principal): Promise<Array<Principal>>;
    getFollowing(user: Principal): Promise<Array<Principal>>;
    getGarageByUser(user: Principal): Promise<Array<Car>>;
    getMessagesWithUser(user: Principal): Promise<Array<Message>>;
    getMyGarage(): Promise<Array<Car>>;
    getMyProfile(): Promise<Profile | null>;
    getPostsByUser(user: Principal): Promise<Array<PostView>>;
    getProfile(user: Principal): Promise<Profile | null>;
    getUserProfile(user: Principal): Promise<Profile | null>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(user: Principal): Promise<boolean>;
    joinClub(clubId: string): Promise<void>;
    leaveClub(clubId: string): Promise<void>;
    likePost(postId: string): Promise<void>;
    listAllClubs(): Promise<Array<ClubView>>;
    listAllEvents(): Promise<Array<EventView>>;
    listAllListings(): Promise<Array<Listing>>;
    listMyNotifications(): Promise<Array<Notification>>;
    markListingSold(listingId: string): Promise<void>;
    markNotificationRead(notificationId: string): Promise<void>;
    removeCar(carId: string): Promise<void>;
    rsvpEvent(eventId: string): Promise<void>;
    saveCallerUserProfile(profile: Profile): Promise<void>;
    sendMessage(receiver: Principal, content: string): Promise<string>;
    sendNotificationToUser(targetUser: Principal, notifType: string, message: string, relatedId: string): Promise<string>;
    unfollowUser(user: Principal): Promise<void>;
    unlikePost(postId: string): Promise<void>;
    unrsvpEvent(eventId: string): Promise<void>;
    updateProfile(displayName: string, bio: string, avatarUrl: string, location: string, bannerUrl: string): Promise<void>;
}
