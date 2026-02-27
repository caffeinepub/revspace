import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Previous versions of Post (no topic field) and Event (no photos)
  type OldPost = {
    id : Text;
    author : Principal;
    content : Text;
    mediaUrls : [Text];
    postType : Text;
    timestamp : Int;
    likes : Set.Set<Principal>;
    comments : List.List<Text>;
  };

  type OldEvent = {
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
  };

  // Old actor definition
  type OldActor = {
    posts : Map.Map<Text, OldPost>;
    events : Map.Map<Text, OldEvent>;
  };

  // New post and event types
  type NewPost = {
    id : Text;
    author : Principal;
    content : Text;
    mediaUrls : [Text];
    postType : Text;
    timestamp : Int;
    likes : Set.Set<Principal>;
    comments : List.List<Text>;
    topic : Text; // New field
  };

  type NewEvent = {
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
    photos : List.List<Text>; // New field
  };

  // New actor type
  type NewActor = {
    posts : Map.Map<Text, NewPost>;
    events : Map.Map<Text, NewEvent>;
  };

  // Migration function
  public func run(old : OldActor) : NewActor {
    let newPosts = old.posts.map<Text, OldPost, NewPost>(
      func(_id, oldPost) {
        { oldPost with topic = "general" };
      }
    );

    let newEvents = old.events.map<Text, OldEvent, NewEvent>(
      func(_id, oldEvent) {
        { oldEvent with photos = List.empty<Text>() };
      }
    );

    {
      posts = newPosts;
      events = newEvents;
    };
  };
};
