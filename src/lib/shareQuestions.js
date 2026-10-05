// Relationship-tailored, tense-aware question bank for the Share a Memory
// modal. Uses gender-neutral "they/their/theirs" throughout — a memorial's
// subject isn't necessarily female, and a memorial page has no gender field
// to key off of, so singular "they" is the only phrasing that's correct for
// every memorial.
export const SHARE_QUESTION_BANK = {
  adult: {
    relationships: [
      { id: "child", label: "Their child" },
      { id: "spouse", label: "Their spouse" },
      { id: "friend", label: "A friend" },
      { id: "coworker", label: "A coworker" },
      { id: "grandchild", label: "Their grandchild" },
      { id: "other", label: "Someone else" },
    ],
    banks: {
      living: {
        child: [
          "What's something they always say that you can still hear in their voice?",
          "What do they do that only a parent would do?",
          "What's something they've taught you without meaning to?",
        ],
        spouse: [
          "What's something about them most people don't get to see?",
          "What do they do that still makes you fall for them?",
          "What's your version of a perfect ordinary day together?",
        ],
        friend: [
          "What's the most \"them\" thing they do?",
          "What do you two always end up talking about?",
          "Is there a trip or night out you still think about?",
        ],
        coworker: [
          "What are they like under pressure?",
          "What's something they do that makes the job better for everyone?",
        ],
        grandchild: [
          "What do they let you get away with?",
          "What's something at their house that's just theirs?",
        ],
        other: [
          "What's a memory of them that makes you smile?",
          "What's something they say that sticks with you?",
          "What's a small habit of theirs you think about?",
        ],
      },
      passed: {
        child: [
          "What's something they always said that you can still hear in their voice?",
          "What did they do that only a parent would do?",
          "What's something they taught you without meaning to?",
        ],
        spouse: [
          "What's something about them most people never got to see?",
          "What did they do that made you fall for them, looking back?",
          "What was your version of a perfect ordinary day together?",
        ],
        friend: [
          "What's the most \"them\" thing they ever did?",
          "What did you two always end up talking about?",
          "Is there a trip or night out you still think about?",
        ],
        coworker: [
          "What were they like under pressure?",
          "What's something they did that made the job better for everyone?",
        ],
        grandchild: [
          "What did they let you get away with?",
          "What's something at their house that was just theirs?",
        ],
        other: [
          "What's a memory of them that still makes you smile?",
          "What's something they said that stuck with you?",
          "What's a small habit of theirs you still think about?",
        ],
      },
    },
    // Each universal prompt is tagged with the single media kind it's
    // fishing for — the guide screen uses this to offer only the one
    // matching upload type (see ShareMemoryModal's guide path).
    universal: [
      { text: "Do you have a photo of them you keep coming back to?", kind: "photo" },
      { text: "Is there a voicemail from them still sitting on your phone?", kind: "voice" },
      { text: "Do you have a video of them that nobody else has seen?", kind: "video" },
    ],
  },
  child: {
    relationships: [
      { id: "parent", label: "Their parent" },
      { id: "sibling", label: "Their sibling" },
      { id: "grandparent", label: "Their grandparent" },
      { id: "friend", label: "A friend" },
      { id: "teacher", label: "A teacher or coach" },
      { id: "other", label: "Someone else" },
    ],
    banks: {
      living: {
        parent: [
          "What do they love more than anything right now?",
          "What makes them laugh the hardest?",
          "What's something they're learning to do?",
        ],
        sibling: [
          "What do you two always play together?",
          "What are they like to share a room with?",
        ],
        grandparent: [
          "What do they call you, or you call them?",
          "What's something they do that's just them?",
        ],
        friend: [
          "What do you two always do together?",
          "What's recess or lunch with them like?",
        ],
        teacher: [
          "What do they love learning about?",
          "What are they like in class or on the team?",
        ],
        other: [
          "What's a memory of them that makes you smile?",
          "What's something they do that's just them?",
        ],
      },
      passed: {
        parent: [
          "What did they love more than anything?",
          "What made them laugh the hardest?",
          "What were they learning to do?",
        ],
        sibling: [
          "What did you two always play together?",
          "What were they like to share a room with?",
        ],
        grandparent: [
          "What did they call you, or you call them?",
          "What was something they did that was just them?",
        ],
        friend: [
          "What did you two always do together?",
          "What was recess or lunch with them like?",
        ],
        teacher: [
          "What did they love learning about?",
          "What were they like in class or on the team?",
        ],
        other: [
          "What's a memory of them that makes you smile?",
          "What's something they said that was just them?",
        ],
      },
    },
    // "Something they made, drew, or wrote" is tagged 'photo' — a picture of
    // the object is the natural single-upload answer to that one.
    universal: [
      { text: "Do you have a photo of them being completely themselves?", kind: "photo" },
      { text: "Do you have a video of them that nobody else has seen?", kind: "video" },
      { text: "Do you have something they made, drew, or wrote?", kind: "photo" },
    ],
  },
};

function ageInYears(dateStr) {
  const birth = new Date(dateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// Silent, date-derived — never asked directly. See SHARE_QUESTION_BANK's
// header comment and the DO NOT list in the modal's build spec.
export function deriveSubjectType(memorial) {
  if (!memorial.born) return "adult";
  return ageInYears(memorial.born) < 18 ? "child" : "adult";
}
export function deriveLivingStatus(memorial) {
  return memorial.passed ? "passed" : "living";
}

// Everything the share flow needs from the bank for one memorial: who the
// contributor might be, the written/spoken prompts for a given relationship
// (falling back to the last, "Someone else", list before one is picked), and
// the universal media prompts.
export function shareQuestionsFor(memorial) {
  const bank = SHARE_QUESTION_BANK[deriveSubjectType(memorial)];
  const byRelationship = bank.banks[deriveLivingStatus(memorial)];
  const fallback = bank.relationships[bank.relationships.length - 1].id;
  return {
    relationships: bank.relationships,
    questionsFor: (relationshipId) => byRelationship[relationshipId || fallback] || byRelationship[fallback] || [],
    universal: bank.universal,
  };
}
