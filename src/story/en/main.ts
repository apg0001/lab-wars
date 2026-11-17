/** 본편 장면(src/story/script.ts) 영어 대본 */
import type { SceneEn } from './index';

export const EN_MAIN: Record<string, SceneEn> = {
  // ── Chapter 1: Undergrad ──
  'ch1-intro': {
    title: 'Chapter 1 · Undergrad',
    lines: [
      '{name}, junior in engineering. Grades: fine-ish. Dream: vaguely "researcher."',
      'Lab internship opening…? They say it looks good on a résumé. Should I check it out?',
      'Oh, are you here to apply? Perfect timing, we need hands!',
      'Ah, yes! I mean, I\'m just looking around…',
      'That\'s how it always starts. For now, help me hold off this paperwork.',
      'Little did I know, memos were already flying in from behind that door.',
    ],
  },
  'ch1-boss': {
    title: 'Office Hours with the Professor',
    lines: [
      'So you\'re the student who\'s been hanging around the lab?',
      'Yes! I\'m really interested in research!',
      'Interest alone won\'t cut it. Have this done by the end of the week.',
      '(Is that pile of paperwork… walking toward me?!)',
    ],
  },
  'ch1-clear': {
    lines: [
      'Whoa, you blocked all of the professor\'s paperwork? You\'ve got talent.',
      'Hi there! I\'m Claudy, your AI assistant. Paper edits, healing, cheerleading — I do it all.',
      'This lab really has everything…',
      'Want to join as an undergrad researcher? The pay is… well, the coffee\'s unlimited.',
    ],
  },

  // ── Chapter 2: Undergrad Researcher ──
  'ch2-intro': {
    title: 'Chapter 2 · Undergrad Researcher',
    lines: [
      'I became an undergrad researcher. One desk, one chair, and endless busywork.',
      'I got my own desk! With two monitors!',
      'One of those monitors is for experiment logs only. It never goes off.',
      'I\'ll watch it 24/7. I don\'t sleep, you see.',
    ],
  },
  'ch2-boss': {
    title: 'The Advisor',
    lines: [
      '{name}, you know the grant report is due tomorrow, right?',
      'That grant… I only found out today that I\'m on it.',
      'Well, now you know. Lab meeting is at 10 PM tonight.',
    ],
  },
  'ch2-clear': {
    lines: [
      'Hmm, not a bad report. Have you thought about grad school?',
      'Grad school? I was planning to get a job…',
      'The combined BS/MS track finishes a year early. There\'s a scholarship, too.',
      '"A year early" sold me. Whether it was true, nobody knows.',
    ],
  },

  // ── Chapter 3: BS/MS Track ──
  'ch3-intro': {
    title: 'Chapter 3 · BS/MS Track',
    lines: [
      'I joined the combined BS/MS track. Classes, research, AND TA duty.',
      'Senpai, a combined track means half the work, right?',
      'Double the work. Undergrad stuff + grad stuff.',
      'I\'ll pump out the code. Bugs may come pumping out with it.',
    ],
  },
  'ch3-boss': {
    title: 'Reviewer 2 Strikes',
    sign: 'Paper Review',
    lines: [
      'My first paper submission! The reviews are in!',
      'The authors do not appear to grasp the basic concepts.',
      'Add 12 experiments, cite 40 related works, and… cite my papers too.',
      'Reviewer 2…! The one from the legends…',
    ],
  },
  'ch3-clear': {
    lines: [
      'It got accepted!! My first paper!',
      'Congrats. Now, time to write your master\'s thesis, yeah?',
      '…When do I get a day off?',
    ],
  },

  // ── Chapter 4: Master's ──
  'ch4-intro': {
    title: 'Chapter 4 · Master\'s',
    lines: [
      'Master\'s program. TA duty, grants, conferences, and the defense.',
      'It\'s 3 AM. Why is everyone still in the lab?',
      'There are two of us, so we\'re twice as awake!',
      '…That\'s not something to brag about.',
    ],
  },
  'ch4-boss': {
    title: 'Winter Conference Keynote',
    sign: 'Winter Symposium',
    lines: [
      'The theme of this keynote is "The Passion of Young Researchers."',
      'So we\'ll have you young researchers run the conference. Unpaid.',
      'Paid in "passion"…!',
    ],
  },
  'ch4-clear': {
    lines: [
      'Master\'s degree conferred. Just as I went to toss my cap—',
      '{name}, why not switch straight into the PhD? The combined MS/PhD track is faster.',
      'Pretty sure I\'ve heard that "faster" before.',
    ],
  },

  // ── Chapter 5: MS/PhD Track ──
  'ch5-intro': {
    title: 'Chapter 5 · MS/PhD Track',
    lines: [
      'The combined MS/PhD track. To graduate, I need a thesis.',
      'I\'m graduating this time. You\'re the Lab Chief now.',
      'What?! Without you, who holds off the paperwork?',
      'You. Good luck.',
    ],
  },
  'ch5-boss': {
    title: 'Thesis Defense',
    lines: [
      'Let us begin. Presentation is 20 minutes. Questions are… unlimited.',
      '(The stamp… anything but that red stamp…!)',
      'In Chapter 3, why are the axis labels in Comic Sans?',
    ],
  },
  'ch5-clear': {
    lines: [
      '…You pass. Well done.',
      'I passed…! Now I can finally graduate…',
      'Since you\'re on the MS/PhD track, that leaves about four more years until the PhD?',
      '……Huh?',
    ],
  },

  // ── Chapter 6: PhD ──
  'ch6-intro': {
    title: 'Chapter 6 · PhD',
    lines: [
      'PhD program. Now I have a junior of my own.',
      'Senpai! How do I hold off this paperwork?',
      'First… grab a coffee. This is going to be a long one.',
      '(Why does that sound familiar?)',
    ],
  },
  'ch6-boss': {
    title: 'The Department Head\'s Office',
    lines: [
      'Department review is coming up, so each lab will submit a 50-page performance report.',
      'So instead of doing research, we write reports about doing research?',
      'That, my friend, is what we call research administration.',
    ],
  },
  'ch6-clear': {
    lines: [
      'PhD commencement. This time it\'s for real.',
      'Doctor…! It\'s finally over!',
      'But to become a professor, one more gate remained: the postdoc.',
    ],
  },

  // ── Chapter 7: Postdoc ──
  'ch7-intro': {
    title: 'Chapter 7 · Postdoc',
    lines: [
      'Postdoctoral researcher. Two-year contract. Goal: a faculty position.',
      'Grants, papers, teaching, mentoring students… all of this is MY job?',
      'I\'m still here. Just a few version bumps later.',
      'This is the last stretch. I\'ll hang on until I land that faculty job.',
    ],
  },
  'ch7-boss': {
    title: 'The President\'s Office',
    lines: [
      'So you\'re the postdoc everyone\'s talking about. Blocked every last form, I hear.',
      'I\'ll fight you for that faculty position, Mr. President.',
      'Very well. I\'ll send you every meeting this university has.',
    ],
  },

  // ── Ending ──
  ending: {
    title: 'Ending',
    lines: [
      'Splendid. Dr. {name}, as of today you are appointed Assistant Professor at our university.',
      'Me… a professor…?',
      'The moment I took the appointment letter, something changed.',
      '…',
      'Well then. Faculty meetings are every Monday at 8 AM.',
      'A few months later, in the lab.',
      'Um… I saw the lab internship posting. I\'m just looking around…',
      'That\'s how it always starts.',
      'Now, have this done by the end of the week.',
      '(Is that pile of paperwork… walking toward me?!)',
      'And so, another professor was born.',
      'And the lab\'s day never ends.',
      '— Lab Wars: The End —   3 Side Stories unlocked.',
      'Design · Dev · Grad-school survival: Gichan Park',
      'Thanks for playing. To every grad student still hanging in there today.',
    ],
    banners: ['A few months later', 'THE END?', 'made by Gichan Park'],
  },
};
