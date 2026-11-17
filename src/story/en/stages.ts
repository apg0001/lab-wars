/** 스테이지 장면 영어 대본 (src/story/stage-scenes.ts와 같은 순서) */
import type { SceneEn } from './index';

const VACATION = 'Break stage: plenty of Caffeine, but the assignments all pile in at once.';
const CONFERENCE = 'Conference stage: lots of reviewers and question barrages (flying), and frequent rushes.';
const THESIS = 'Thesis stage: Revision Bombs rain down and the Prof\'s Office is extra sturdy.';

export const EN_STAGES: Record<string, SceneEn> = {
  // ───────────── Chapter 1: Undergrad ─────────────
  'st-1-1': { lines: [
    'Syllabus week. There is still hope left in the lecture hall.',
    "This semester I'm actually going to try. I even bought a planner!",
    'On the first page of the planner, “Assignment 1” had already landed.',
  ] },
  'st-1-2': { lines: [
    'Course registration opens at 10:00 sharp… refresh… refresh…',
    'The required major course? It filled up in three seconds.',
    "Three seconds?! The server is faster than me!",
    'Email the professor during add/drop. Whether they reply is… luck.',
  ] },
  'st-1-3': { lines: [
    'I made a group chat for the group project! Everyone say hi!',
    '(Seen by 4 · Replies: 0)',
    "…So I'm presenting, making the slides, AND writing the report.",
  ] },
  'st-1-4': { lines: [
    'They said the midterm covers “Chapter 1 through today.”',
    'That basically means everything. Want some coffee?',
    'Two cups. No, three.',
  ] },
  'st-1-5': { lines: [
    'Campus festival! Concerts! Food stalls! Fireworks!',
    'Fun fact: the assignment is due the day the festival ends.',
    '…So the memos keep flying even during the festival.',
  ] },
  'st-1-6': { lines: [
    'Summer break at last! Beach, travel, sleeping in!',
    'Did you see the summer assignment notice? Every deadline is in the same week.',
    '…What was the definition of “break” again?',
    VACATION,
  ] },
  'st-1-7': { lines: [
    'If I take summer session, I graduate a semester early!',
    'Sure. You just cram a whole semester into three weeks.',
    '…“Early” is always a trap.',
  ] },
  'st-1-8': { lines: [
    'Finals week. Every library seat was taken by 6 AM.',
    'Three exams, two papers, one group presentation. Same day.',
    'If I can just get through this… just get through…!',
  ] },
  'st-1-9': { lines: [
    'So this is the lab. The door says “Do Not Knock — Experiment in Progress.”',
    'Oh, you made it! I booked you a meeting with the professor. Today.',
    "Today?! I'm not mentally prepared…",
    "Nobody's ever prepared. Let's go.",
  ] },

  // ───────────── Chapter 2: Undergrad Researcher ─────────────
  'st-2-1': { lines: [
    'I applied to be an undergrad researcher! I rewrote my personal statement three times.',
    "You're in. Congrats. Oh, the application was just a formality.",
    'Welcome! Your first task is organizing paperwork.',
  ] },
  'st-2-2': { lines: [
    'First lab meeting. The whiteboard is covered in incomprehensible equations.',
    '{name}, read 20 related papers by next week.',
    'Twenty? In one week?',
    "I can help with summaries. The reading part you'll have to do yourself.",
  ] },
  'st-2-3': { lines: [
    'Setting up the equipment… the manual is in German.',
    "Nobody in this lab has ever read that manual. Just wing it.",
    "Are we sure about winging it? Isn't this thing expensive?",
    'If it breaks, you fill out 30 pages of forms. Careful.',
  ] },
  'st-2-4': { sign: 'Spring Conference', lines: [
    'At a conference you listen to talks, network, and carry the boxes.',
    'All the poster tubes AND the swag boxes?',
    '…I have a question. Several, actually.',
    CONFERENCE,
  ] },
  'st-2-5': { lines: [
    "I'm running the same experiment for the 47th time.",
    'Hit 50 and it becomes statistically significant.',
    'Only 3 of the 47 runs came out different. Those 3 are the most interesting!',
    '…So I have to start over from scratch.',
  ] },
  'st-2-6': { lines: [
    'File name: final_REALfinal_revised_v7_profchecked.xlsx',
    'There are three files with that exact name in the folder.',
    'Which one is the REAL final?!',
  ] },
  'st-2-7': { lines: [
    "You're presenting at paper club four times this week.",
    'The paper I picked is 47 pages.',
    '120 with the appendix. The questions always come from the appendix.',
  ] },
  'st-2-8': { lines: [
    "It's winter break. Why am I clocking in?",
    "Break is for students. The lab doesn't take breaks.",
    'The heating is off. Stay warm with monitor heat!',
    VACATION,
  ] },
  'st-2-9': { lines: [
    'You want my capstone project to be the same as the lab grant project?',
    'Two birds, one stone. From the professor\'s point of view.',
    "From mine it's two birds, one all-nighter.",
  ] },

  // ───────────── Chapter 3: BS/MS Track ─────────────
  'st-3-1': { lines: [
    'BS/MS Track orientation. Two cohort-mates, and a very tired senior.',
    "I'm an official grad student! Even my student ID changed color!",
    'Congrats. Lab supply inventory is your job now.',
  ] },
  'st-3-2': { lines: [
    'Grad classes must be different, right? Discussions, depth…',
    'Day one, the presentation schedule was set: one person, three papers, every week.',
    "With three students, that's once every three weeks…",
    "I'll draft your slides. The figures might be a little… creative.",
  ] },
  'st-3-3': { lines: [
    'Progress this week?',
    "The experiment isn't working, so I'm still looking for the cause…",
    'Then just show me double next week.',
    '(Double of zero is still zero…)',
  ] },
  'st-3-4': { sign: 'Summer Conference', lines: [
    'My first poster! Size A0, font size 8pt.',
    "Nobody can read 8pt. So they'll all come ask you.",
    "This graph's y-axis doesn't start at zero?",
    CONFERENCE,
  ] },
  'st-3-5': { lines: [
    'Summer plan: experiment, experiment, paper, experiment.',
    'I wrote 30,000 lines of code over break! Zero lines of tests!',
    'And if all 30,000 lines are bugs?',
    VACATION,
  ] },
  'st-3-6': { lines: [
    "I can't reproduce the paper's results.",
    'The last commit message on the authors\' GitHub is “temp.”',
    'A “temp” paper with 500 citations…?',
  ] },
  'st-3-7': { lines: [
    'My first paper draft! Intro, methods, results, conclusion!',
    'Your introduction already says everything in the conclusion.',
    "…Isn't that what an intro is?",
  ] },
  'st-3-8': { lines: [
    'I read your draft. Went through three red pens.',
    'Why three red pens…',
    'Rewrite it from the first sentence. Oh, and the title.',
  ] },
  'st-3-9': { lines: [
    '11 minutes to the submission deadline. The submission system is not responding.',
    "The PDF won't upload! File too large!",
    'I compressed the figures! Now the graphs are pixel art.',
    '…Submitted!',
  ] },

  // ───────────── Chapter 4: Master's ─────────────
  'st-4-1': { lines: [
    'First day as a TA. 82 emails from undergrads.',
    '61 of them are “What\'s on the exam?”!',
    "I posted it on the course page… nobody reads the course page…",
  ] },
  'st-4-2': { lines: [
    "Grading 200 exams. The rubric only exists in the professor's head.",
    'There are three versions of the answer to question 2.',
    'The regrade request period is the scariest part.',
  ] },
  'st-4-3': { lines: [
    "{name}, you'll handle the midterm report for the government grant.",
    'What was my role on that grant again?',
    'Writing the report.',
  ] },
  'st-4-4': { sign: 'Fall Conference', lines: [
    'A 15-minute oral talk. I rehearsed it 40 times.',
    'One minute before the talk, the laptop started installing updates.',
    "We're short on time, so questions only. Starting with mine.",
    CONFERENCE,
  ] },
  'st-4-5': { lines: [
    'Processing grant receipts. Seven stamps, four signatures.',
    'This receipt is dated in the previous fiscal year!',
    'So… resubmit for approval…',
  ] },
  'st-4-6': { lines: [
    "We're moving the lab to the building next door. This weekend.",
    'The equipment weighs over two tons!',
    "Five grad students, so that's 400 kg each.",
  ] },
  'st-4-7': { lines: [
    "Winter break experiment schedule… there's no gap on Christmas.",
    'But you get half a day off for New Year\'s!',
    VACATION,
  ] },
  'st-4-8': { lines: [
    "Master's thesis draft. The table of contents alone took a week.",
    'Your “Future Work” chapter is longer than the main text.',
    "That's because I want to do a lot and haven't done any of it.",
  ] },
  'st-4-9': { lines: [
    'Defense rehearsal. 50 expected questions, all prepared.',
    'In the real thing, they ask question 51. Always.',
    'What IS question 51?!',
  ] },

  // ───────────── Chapter 5: MS/PhD Track ─────────────
  'st-5-1': { lines: [
    'For the MS/PhD Track transfer, sign here, here, and here.',
    'The last page says “Graduation date to be decided in consultation with the advisor”…',
    "We'll consult. And I'll decide.",
  ] },
  'st-5-2': { lines: [
    'The handover doc my senior left behind. Title: “Figure It Out.”',
    'Server passwords, equipment booking, supply orders, team dinner spots…',
    'At the very bottom it says “Clean the coffee machine on Fridays.”',
    'So that was the most important part.',
  ] },
  'st-5-3': { sign: 'Spring Conference', lines: [
    "I'm session chair. Keeping time is my job.",
    'Keep the talks short and give me plenty of time for questions.',
    '(Why does this person show up EVERY time…)',
    CONFERENCE,
  ] },
  'st-5-4': { lines: [
    '214 emails, 89 DMs, 12 group chats.',
    "Notifications off: I miss the professor. Notifications on: I can't do anything.",
    "I wrote a notification filter! It blocks everything except the professor's messages.",
    "…That's the biggest pile.",
  ] },
  'st-5-5': { lines: [
    'Summer goal: thesis through Chapter 3.',
    'Current progress: Chapter 0.4.',
    VACATION,
  ] },
  'st-5-6': { lines: [
    'For my thesis topic, if I tie together all my research so far…',
    "Good. But trends have shifted, so let's tweak the topic a little.",
    'How little is a little…',
    'From scratch.',
  ] },
  'st-5-7': { lines: [
    "Thesis… I've been writing the introduction for three weeks.",
    "I'll polish your sentences. But the conclusion you write yourself.",
    'Another revision request email…!',
    THESIS,
  ] },
  'st-5-8': { lines: [
    'Revision v12. Professor\'s comment: “v3 was better.”',
    'If I go back to v3… the last two months…',
    'I overwrote the v3 file. Sorry!',
    THESIS,
  ] },
  'st-5-9': { lines: [
    "This is the preliminary review. We find problems early, before the final defense.",
    'We found the problems early. All of them.',
    '(One month until the final defense…)',
    THESIS,
  ] },

  // ───────────── Chapter 6: PhD ─────────────
  'st-6-1': { lines: [
    'PhD qualifying exam. Scope: the entire field.',
    'What happens if you fail it?',
    "You get one retake. Fail twice and… I'd rather not say.",
  ] },
  'st-6-2': { lines: [
    "I rebooted the server and everyone else's experiments died!",
    "(Been there…) It's fine, let's check the logs first.",
    'The logs got wiped too.',
    "…It's not fine.",
  ] },
  'st-6-3': { sign: 'Summer Conference', lines: [
    "An invited talk! I'm finally getting recognized.",
    'No speaker fee, book your own hotel, and the Q&A will be long.',
    '…What does “invited” even mean.',
    CONFERENCE,
  ] },
  'st-6-4': { lines: [
    'On this grant, PhD candidate {name} is the project lead.',
    'I get the responsibility, but what about the authority?',
    'The authority is mine. The responsibility is yours.',
  ] },
  'st-6-5': { lines: [
    '2 AM. The whole building lost power.',
    '72 hours of unsaved experiment data…',
    "We're both in the cloud, so we survived!",
    "What good is it if only YOU survived!",
  ] },
  'st-6-6': { lines: [
    'Thank you for the revision. It has raised new concerns.',
    'I changed exactly what you told me to last time…!',
    "Yes. Hence the concerns.",
  ] },
  'st-6-7': { sign: 'Fall Conference', lines: [
    "I'm chairing the session. This time I get to ask the questions.",
    'Please go easy on the questions during my talk…',
    '(I think I kind of get Reviewer 2 now.)',
    CONFERENCE,
  ] },
  'st-6-8': { lines: [
    'Winter break = grant reconciliation season.',
    'Submit all 314 original receipts by this Friday.',
    'Break got eaten by accounting…',
    VACATION,
  ] },
  'st-6-9': { lines: [
    'PhD dissertation: 280 pages. Only the acknowledgments left.',
    "You'll put me in the acknowledgments, right?",
    'Of course. Right after the coffee machine.',
  ] },

  // ───────────── Chapter 7: Postdoc ─────────────
  'st-7-1': { lines: [
    'Postdoc contract… one-year term, extension “possible.”',
    'Possible means possible.',
    'So does impossible.',
  ] },
  'st-7-2': { sign: 'Visiting Lab', lines: [
    'Research abroad. New country, new lab, familiar paperwork.',
    'Seven stamps per receipt here too.',
    'The local server password is “password123”!',
  ] },
  'st-7-3': { sign: 'International Conference', lines: [
    'The session right after the keynote… the whole audience left.',
    "I'm still here. To ask questions.",
    '…You really are everywhere.',
    CONFERENCE,
  ] },
  'st-7-4': { lines: [
    'Four grant proposals, all due the same day.',
    'Each proposal says “innovative” 23 times.',
    'Hopefully the reviewers find it innovative too.',
  ] },
  'st-7-5': { lines: [
    "Cover my lecture tomorrow, would you? I've got a conference.",
    'That class has 200 students!',
    'Are you taking attendance in your lecture?',
  ] },
  'st-7-6': { lines: [
    'Break? Postdocs don\'t get breaks.',
    "I'm on vacation next week!",
    '(…So jealous.)',
    VACATION,
  ] },
  'st-7-7': { lines: [
    'Collaboration meeting. Six institutions, four time zones.',
    "I found a time that works! It's 4 AM Korea time.",
    '…Equally inconvenient for everyone.',
  ] },
  'st-7-8': { lines: [
    'Faculty application: research statement, teaching philosophy, 15 papers, 3 recommendation letters.',
    "Long time no see! I'll write you a letter. In exchange, our company project…",
    'Senpai! Even you hand me work in the end!',
  ] },
  'st-7-9': { lines: [
    'Faculty interview. Seven interviewers, five questions each.',
    'If you join our department, can you also take on admin duties?',
    "…Yes. (If I say no, I'm out.)",
    "Only the final gate remains. The President's Office.",
  ] },
};
