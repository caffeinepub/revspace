import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Array "mo:core/Array";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Nat "mo:core/Nat";
import Int "mo:core/Int";



actor {
  //-----------------------------
  // Types
  //-----------------------------
  module Types {
    public type Post = {
      id : Text;
      author : Principal;
      content : Text;
      mediaUrls : [Text];
      postType : Text;
      timestamp : Int;
      likes : Set.Set<Principal>;
      comments : List.List<Text>;
      topic : Text;
    };

    public type PostView = {
      id : Text;
      author : Principal;
      content : Text;
      mediaUrls : [Text];
      postType : Text;
      timestamp : Int;
      likes : [Principal];
      comments : [Text];
      topic : Text;
    };

    public type Comment = {
      id : Text;
      author : Principal;
      content : Text;
      postId : Text;
      timestamp : Int;
      parentCommentId : ?Text;
    };

    public type Profile = {
      displayName : Text;
      bio : Text;
      avatarUrl : Text;
      location : Text;
      bannerUrl : Text;
    };

    public type Car = {
      id : Text;
      owner : Principal;
      make : Text;
      model : Text;
      year : Text;
      color : Text;
      description : Text;
      modifications : [Text];
      imageUrls : [Text];
    };

    public type Event = {
      id : Text;
      creator : Principal;
      title : Text;
      description : Text;
      location : Text;
      eventDate : Int;
      coverImageUrl : Text;
      category : Text;
      maxAttendees : Nat;
      attendees : Set.Set<Principal>;
      photos : List.List<Text>;
    };

    public type EventView = {
      id : Text;
      creator : Principal;
      title : Text;
      description : Text;
      location : Text;
      eventDate : Int;
      coverImageUrl : Text;
      category : Text;
      maxAttendees : Nat;
      attendees : [Principal];
      photos : [Text];
    };

    public type Listing = {
      id : Text;
      seller : Principal;
      title : Text;
      description : Text;
      price : Nat;
      category : Text;
      condition : Text;
      imageUrls : [Text];
      location : Text;
      isSold : Bool;
    };

    public type Club = {
      id : Text;
      creator : Principal;
      name : Text;
      description : Text;
      category : Text;
      coverImageUrl : Text;
      members : Set.Set<Principal>;
    };

    public type ClubView = {
      id : Text;
      creator : Principal;
      name : Text;
      description : Text;
      category : Text;
      coverImageUrl : Text;
      members : [Principal];
    };

    public type Notification = {
      id : Text;
      user : Principal;
      notifType : Text;
      message : Text;
      relatedId : Text;
      isRead : Bool;
      timestamp : Int;
    };

    public type Message = {
      id : Text;
      sender : Principal;
      receiver : Principal;
      content : Text;
      timestamp : Int;
    };

    public type Follow = {
      follower : Principal;
      following : Principal;
    };

    public type UserRole = {
      #admin;
      #user;
      #guest;
    };

    public type UserWithRole = {
      principal : Principal;
      role : UserRole;
    };

    public type ProfileWithPrincipal = {
      principal : Principal;
      profile : Profile;
    };
  };

  // Helper functions for converting to View objects
  module Mappers {
    public func eventToView(event : Types.Event) : Types.EventView = {
      id = event.id;
      creator = event.creator;
      title = event.title;
      description = event.description;
      location = event.location;
      eventDate = event.eventDate;
      coverImageUrl = event.coverImageUrl;
      category = event.category;
      maxAttendees = event.maxAttendees;
      attendees = event.attendees.toArray();
      photos = event.photos.toArray();
    };

    public func clubToView(club : Types.Club) : Types.ClubView = {
      id = club.id;
      creator = club.creator;
      name = club.name;
      description = club.description;
      category = club.category;
      coverImageUrl = club.coverImageUrl;
      members = club.members.toArray();
    };

    public func postToView(post : Types.Post) : Types.PostView = {
      id = post.id;
      author = post.author;
      content = post.content;
      mediaUrls = post.mediaUrls;
      postType = post.postType;
      timestamp = post.timestamp;
      likes = post.likes.toArray();
      comments = post.comments.toArray();
      topic = post.topic;
    };
  };

  //-----------------------------------
  // Storage and Auth Integration
  //-----------------------------------
  include MixinStorage();

  // Authorization State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Persistent Stable Maps
  let posts = Map.empty<Text, Types.Post>();
  let comments = Map.empty<Text, Types.Comment>();
  let profiles = Map.empty<Principal, Types.Profile>();
  let cars = Map.empty<Text, Types.Car>();
  let events = Map.empty<Text, Types.Event>();
  let listings = Map.empty<Text, Types.Listing>();
  let clubs = Map.empty<Text, Types.Club>();
  let notifications = Map.empty<Text, Types.Notification>();
  let messages = Map.empty<Text, Types.Message>();
  let follows = Map.empty<Principal, Set.Set<Principal>>();
  let followers = Map.empty<Principal, Set.Set<Principal>>();

  // -----------------------------------
  // Utils
  // -----------------------------------
  func generateId(prefix : Text) : Text {
    let time = Time.now().toText();
    prefix # "_" # time;
  };

  // -----------------------------------
  // ADMIN FUNCTIONS
  // -----------------------------------
  // Returns array of {principal, role} for every registered user
  public query ({ caller }) func adminGetAllUsers() : async [Types.UserWithRole] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };

    let allEntries = accessControlState.userRoles.entries().toArray();
    allEntries.map(
      func((principal, role)) {
        {
          principal;
          role = switch (role) {
            case (#admin) { #admin };
            case (#user) { #user };
            case (#guest) { #guest };
          };
        };
      }
    );
  };

  // Return array of {principal, Profile} for all profiles
  public query ({ caller }) func adminGetAllProfiles() : async [Types.ProfileWithPrincipal] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };
    let allEntries = profiles.entries().toArray();
    allEntries.map(
      func((principal, profile)) {
        {
          principal;
          profile;
        };
      }
    );
  };

  // Delete profile by principal
  public shared ({ caller }) func adminDeleteProfile(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };
    if (not profiles.containsKey(user)) {
      Runtime.trap("Profile does not exist");
    };
    profiles.remove(user);
  };

  // Delete any post by ID (admin bypass)
  public shared ({ caller }) func adminDeletePost(postId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?_post) {
        posts.remove(postId);
      };
    };
  };

  // Delete any listing by ID (admin bypass)
  public shared ({ caller }) func adminDeleteListing(listingId : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };
    switch (listings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?_listing) {
        listings.remove(listingId);
      };
    };
  };

  // Ban user by demoting them to guest
  public shared ({ caller }) func adminBanUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };

    switch (AccessControl.getUserRole(accessControlState, user)) {
      case (#admin) { Runtime.trap("Cannot ban admin") };
      case (#guest) { Runtime.trap("User already banned") };
      case (#user) {
        AccessControl.assignRole(accessControlState, caller, user, #guest);
      };
    };
  };

  // Unban/restores banned user back to user role
  public shared ({ caller }) func adminUnbanUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };

    switch (AccessControl.getUserRole(accessControlState, user)) {
      case (#admin) { Runtime.trap("Already admin") };
      case (#user) { Runtime.trap("Not currently banned") };
      case (#guest) {
        AccessControl.assignRole(accessControlState, caller, user, #user);
      };
    };
  };

  // Admin-only function to update user's location field
  public shared ({ caller }) func adminUpdateUserLocation(user : Principal, newLocation : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };

    switch (profiles.get(user)) {
      case (null) {
        Runtime.trap("Profile not found");
      };
      case (?existingProfile) {
        let updatedProfile = {
          existingProfile with location = newLocation
        };
        profiles.add(user, updatedProfile);
      };
    };
  };

  // --- EXISTING API (unchanged) ---
  // -----------------------------------
  // POSTS
  // -----------------------------------
  public shared ({ caller }) func createPost(content : Text, mediaUrls : [Text], postType : Text, topic : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    let id = generateId("POST");
    let post : Types.Post = {
      id;
      author = caller;
      content;
      mediaUrls;
      postType;
      timestamp = Time.now();
      likes = Set.empty<Principal>();
      comments = List.empty<Text>();
      topic;
    };
    posts.add(id, post);
    id;
  };

  public query ({ caller }) func getAllPosts() : async [Types.PostView] {
    posts.values().toArray().map(func(post) { Mappers.postToView(post) });
  };

  public query ({ caller }) func getPostsByUser(user : Principal) : async [Types.PostView] {
    let allPosts = posts.values().toArray();
    allPosts.filter(
      func(p) { p.author == user }
    ).map(func(post) { Mappers.postToView(post) });
  };

  public shared ({ caller }) func likePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        post.likes.add(caller);
        posts.add(postId, post);
        if (post.author != caller) {
          let _ = pushNotification(post.author, "like", "Someone liked your post", postId);
        };
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        post.likes.remove(caller);
        posts.add(postId, post);
      };
    };
  };

  // Updated addComment (parentCommentId is now null for top-level comments)
  public shared ({ caller }) func addComment(postId : Text, content : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment on posts");
    };
    let id = generateId("COMMENT");
    let comment : Types.Comment = {
      id;
      author = caller;
      content;
      postId;
      timestamp = Time.now();
      parentCommentId = null; // Top-level comment (no parent)
    };
    comments.add(id, comment);
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        post.comments.add(id);
        posts.add(postId, post);
        if (post.author != caller) {
          let _ = pushNotification(post.author, "comment", "Someone commented on your post", postId);
        };
      };
    };
    id;
  };

  // New function: addCommentReply
  public shared ({ caller }) func addCommentReply(postId : Text, parentCommentId : Text, content : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can reply to comments");
    };

    if (not posts.containsKey(postId)) {
      Runtime.trap("Post not found");
    };

    switch (comments.get(parentCommentId)) {
      case (null) { Runtime.trap("Parent comment not found") };
      case (?parentComment) {
        let id = generateId("COMMENT");
        let comment : Types.Comment = {
          id;
          author = caller;
          content;
          postId;
          timestamp = Time.now();
          parentCommentId = ?parentCommentId;
        };
        comments.add(id, comment);

        switch (posts.get(postId)) {
          case (null) {}; // Should not happen, already checked
          case (?post) {
            post.comments.add(id);
            posts.add(postId, post);
          };
        };

        if (parentComment.author != caller) {
          let _ = pushNotification(parentComment.author, "reply", "Someone replied to your comment", parentCommentId);
        };
        id;
      };
    };
  };

  // New function: getRepliesToComment
  public query ({ caller }) func getRepliesToComment(commentId : Text) : async [Types.Comment] {
    return comments.values().toArray().filter(
      func(c) { c.parentCommentId == ?commentId }
    );
  };

  public query ({ caller }) func getCommentsForPost(postId : Text) : async [Types.Comment] {
    return comments.values().toArray().filter(
      func(c) { c.postId == postId }
    );
  };

  public shared ({ caller }) func deletePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?post) {
        if (post.author != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this post");
        };
        posts.remove(postId);
      };
    };
  };

  // -----------------------------------
  // USER PROFILES
  // -----------------------------------
  public shared ({ caller }) func saveCallerUserProfile(profile : Types.Profile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    profiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?Types.Profile {
    profiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?Types.Profile {
    profiles.get(user);
  };

  public shared ({ caller }) func updateProfile(displayName : Text, bio : Text, avatarUrl : Text, location : Text, bannerUrl : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profiles");
    };
    let profile : Types.Profile = {
      displayName;
      bio;
      avatarUrl;
      location;
      bannerUrl;
    };
    profiles.add(caller, profile);
  };

  public query ({ caller }) func getMyProfile() : async ?Types.Profile {
    profiles.get(caller);
  };

  public query ({ caller }) func getProfile(user : Principal) : async ?Types.Profile {
    profiles.get(user);
  };

  // -----------------------------------
  // GARAGE
  // -----------------------------------
  public shared ({ caller }) func addCar(make : Text, model : Text, year : Text, color : Text, description : Text, modifications : [Text], imageUrls : [Text]) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add cars");
    };
    let id = generateId("CAR");
    let car : Types.Car = {
      id;
      owner = caller;
      make;
      model;
      year;
      color;
      description;
      modifications;
      imageUrls;
    };
    cars.add(id, car);
    id;
  };

  public query ({ caller }) func getMyGarage() : async [Types.Car] {
    cars.values().toArray().filter(
      func(c) { c.owner == caller }
    );
  };

  public query ({ caller }) func getGarageByUser(user : Principal) : async [Types.Car] {
    cars.values().toArray().filter(
      func(c) { c.owner == user }
    );
  };

  public shared ({ caller }) func removeCar(carId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove cars");
    };
    switch (cars.get(carId)) {
      case (null) { Runtime.trap("Car not found") };
      case (?car) {
        if (car.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this car");
        };
        cars.remove(carId);
      };
    };
  };

  // -----------------------------------
  // EVENTS
  // -----------------------------------
  public shared ({ caller }) func createEvent(title : Text, description : Text, location : Text, eventDate : Int, coverImageUrl : Text, category : Text, maxAttendees : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create events");
    };
    let id = generateId("EVENT");
    let event : Types.Event = {
      id;
      creator = caller;
      title;
      description;
      location;
      eventDate;
      coverImageUrl;
      category;
      maxAttendees;
      attendees = Set.empty<Principal>();
      photos = List.empty<Text>();
    };
    events.add(id, event);
    id;
  };

  public query ({ caller }) func listAllEvents() : async [Types.EventView] {
    events.values().toArray().map(func(event) { Mappers.eventToView(event) });
  };

  public shared ({ caller }) func rsvpEvent(eventId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can RSVP to events");
    };
    switch (events.get(eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) {
        if (event.attendees.size() >= event.maxAttendees) { Runtime.trap("Event is full") };
        event.attendees.add(caller);
        events.add(eventId, event);
      };
    };
  };

  public shared ({ caller }) func unrsvpEvent(eventId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can un-RSVP from events");
    };
    switch (events.get(eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) {
        event.attendees.remove(caller);
        events.add(eventId, event);
      };
    };
  };

  public query ({ caller }) func getEventAttendees(eventId : Text) : async [Principal] {
    switch (events.get(eventId)) {
      case (null) { [] };
      case (?event) {
        event.attendees.toArray();
      };
    };
  };

  // New Function: Delete Event (only by creator or admin)
  public shared ({ caller }) func deleteEvent(eventId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete events");
    };
    switch (events.get(eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) {
        if (event.creator != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this event");
        };
        events.remove(eventId);
      };
    };
  };

  // New Function: Add Photo to Event
  public shared ({ caller }) func addEventPhoto(eventId : Text, photoUrl : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add event photos");
    };
    switch (events.get(eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) {
        event.photos.add(photoUrl);
        events.add(eventId, event);
      };
    };
  };

  // New Function: Get Event Photos
  public query ({ caller }) func getEventPhotos(eventId : Text) : async [Text] {
    switch (events.get(eventId)) {
      case (null) { [] };
      case (?event) { event.photos.toArray() };
    };
  };

  // -----------------------------------
  // MARKETPLACE
  // -----------------------------------
  public shared ({ caller }) func createListing(title : Text, description : Text, price : Nat, category : Text, condition : Text, imageUrls : [Text], location : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create listings");
    };
    let id = generateId("LISTING");
    let listing : Types.Listing = {
      id;
      seller = caller;
      title;
      description;
      price;
      category;
      condition;
      imageUrls;
      location;
      isSold = false;
    };
    listings.add(id, listing);
    id;
  };

  public query ({ caller }) func listAllListings() : async [Types.Listing] {
    listings.values().toArray().filter(
      func(l) { not l.isSold }
    );
  };

  public shared ({ caller }) func markListingSold(listingId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark listings as sold");
    };
    switch (listings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (listing.seller != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this listing");
        };
        let updatedListing : Types.Listing = { listing with isSold = true };
        listings.add(listingId, updatedListing);
      };
    };
  };

  public shared ({ caller }) func deleteListing(listingId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete listings");
    };
    switch (listings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (listing.seller != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this listing");
        };
        listings.remove(listingId);
      };
    };
  };

  // -----------------------------------
  // CAR CLUBS
  // -----------------------------------
  public shared ({ caller }) func createClub(name : Text, description : Text, category : Text, coverImageUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create clubs");
    };
    let id = generateId("CLUB");
    let members = Set.empty<Principal>();
    members.add(caller);
    let club : Types.Club = {
      id;
      creator = caller;
      name;
      description;
      category;
      coverImageUrl;
      members;
    };
    clubs.add(id, club);
    id;
  };

  public query ({ caller }) func listAllClubs() : async [Types.ClubView] {
    clubs.values().toArray().map(func(club) { Mappers.clubToView(club) });
  };

  public shared ({ caller }) func joinClub(clubId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join clubs");
    };
    switch (clubs.get(clubId)) {
      case (null) { Runtime.trap("Club not found") };
      case (?club) {
        club.members.add(caller);
        clubs.add(clubId, club);
      };
    };
  };

  public shared ({ caller }) func leaveClub(clubId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can leave clubs");
    };
    switch (clubs.get(clubId)) {
      case (null) { Runtime.trap("Club not found") };
      case (?club) {
        club.members.remove(caller);
        clubs.add(clubId, club);
      };
    };
  };

  public query ({ caller }) func getClubMembers(clubId : Text) : async [Principal] {
    switch (clubs.get(clubId)) {
      case (null) { [] };
      case (?club) {
        club.members.toArray();
      };
    };
  };

  // -----------------------------------
  // SOCIAL FOLLOWING
  // -----------------------------------
  public shared ({ caller }) func followUser(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can follow others");
    };
    if (caller == user) {
      Runtime.trap("Cannot follow yourself");
    };
    let followingList = switch (follows.get(caller)) {
      case (null) {
        let set = Set.empty<Principal>();
        follows.add(caller, set);
        set;
      };
      case (?existing) { existing };
    };
    followingList.add(user);

    let followersList = switch (followers.get(user)) {
      case (null) {
        let set = Set.empty<Principal>();
        followers.add(user, set);
        set;
      };
      case (?existing) { existing };
    };
    followersList.add(caller);

    let _ = pushNotification(user, "follow", "Someone started following you", caller.toText());
  };

  public shared ({ caller }) func unfollowUser(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfollow others");
    };
    switch (follows.get(caller)) {
      case (null) { /* No-op: not following anyone */ };
      case (?followingList) {
        followingList.remove(user);
      };
    };

    switch (followers.get(user)) {
      case (null) { /* No-op: user has no followers */ };
      case (?followersList) {
        followersList.remove(caller);
      };
    };
  };

  public query ({ caller }) func getFollowers(user : Principal) : async [Principal] {
    switch (followers.get(user)) {
      case (null) { [] };
      case (?followersList) { followersList.toArray() };
    };
  };

  public query ({ caller }) func getFollowing(user : Principal) : async [Principal] {
    switch (follows.get(user)) {
      case (null) { [] };
      case (?followingList) { followingList.toArray() };
    };
  };

  public query ({ caller }) func isFollowing(user : Principal) : async Bool {
    switch (follows.get(caller)) {
      case (null) { false };
      case (?followingList) { followingList.contains(user) };
    };
  };

  // -----------------------------------
  // NOTIFICATIONS
  // -----------------------------------
  public shared ({ caller }) func createNotification(notifType : Text, message : Text, relatedId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create notifications");
    };
    let id = generateId("NOTIF");
    let notification : Types.Notification = {
      id;
      user = caller;
      notifType;
      message;
      relatedId;
      isRead = false;
      timestamp = Time.now();
    };
    notifications.add(id, notification);
    id;
  };

  public shared ({ caller }) func sendNotificationToUser(targetUser : Principal, notifType : Text, message : Text, relatedId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send notifications");
    };
    pushNotification(targetUser, notifType, message, relatedId);
  };

  func pushNotification(targetUser : Principal, notifType : Text, message : Text, relatedId : Text) : Text {
    let id = generateId("NOTIF");
    let notification : Types.Notification = {
      id;
      user = targetUser;
      notifType;
      message;
      relatedId;
      isRead = false;
      timestamp = Time.now();
    };
    notifications.add(id, notification);
    id;
  };

  public query ({ caller }) func listMyNotifications() : async [Types.Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };
    notifications.values().toArray().filter(
      func(n) { n.user == caller }
    );
  };

  public shared ({ caller }) func markNotificationRead(notificationId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };
    switch (notifications.get(notificationId)) {
      case (null) { Runtime.trap("Notification not found") };
      case (?notification) {
        if (notification.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this notification");
        };
        let updatedNotification : Types.Notification = { notification with isRead = true };
        notifications.add(notificationId, updatedNotification);
      };
    };
  };

  // -----------------------------------
  // MESSAGES
  // -----------------------------------
  public shared ({ caller }) func sendMessage(receiver : Principal, content : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    if (receiver == caller) { Runtime.trap("Cannot send message to yourself") };
    let id = generateId("MSG");
    let message : Types.Message = {
      id;
      sender = caller;
      receiver;
      content;
      timestamp = Time.now();
    };
    messages.add(id, message);
    let _ = pushNotification(receiver, "message", "You have a new message", id);
    id;
  };

  public query ({ caller }) func getConversations() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };
    let allMessages = messages.values().toArray();
    let participants = Set.empty<Principal>();

    for (msg in allMessages.values()) {
      if (msg.sender == caller) { participants.add(msg.receiver) };
      if (msg.receiver == caller) { participants.add(msg.sender) };
    };

    participants.toArray();
  };

  public query ({ caller }) func getMessagesWithUser(user : Principal) : async [Types.Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };
    messages.values().toArray().filter(
      func(m) {
        (m.sender == caller and m.receiver == user) or (m.sender == user and m.receiver == caller)
      }
    );
  };
};

