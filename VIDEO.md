# Video script (output and records)

Target length: 2 to 5 minutes for the whole team. Lines below are the care-handoff scenes. Bracketed beats belong to the other layers. Read the problem sentence in the form the brief requires.

This tool supports referral. It is not a diagnosis.

## 0:00 Problem

[Team] Because of this tool, a frontline health worker at a crowded rural clinic will recognise a child's danger signs and refer them within minutes of arrival, when they would otherwise miss the signs, miscount the child's breathing, or see the child late.

## 0:25 Why this is not an SMS menu

[Team] An SMS menu cannot pull a danger sign out of a caregiver's sentence, and a search box needs a network. The model only fills a fixed case. Fixed rules decide. The worker confirms. This phone then shows one action and a passport the next clinic can scan with no network.

## 1:10 Demo, airplane mode

[Input] Type the Swahili sentence. Show that the page does not call the network.

[Decision] Show the rule that fired, with the quoted WHO line, and the facility it chose.

[Handoff — this layer] Land on the result:

"Urgent referral recommended. Reason: not able to drink or breastfeed. Destination: District Clinic B. Action: please go to the recommended facility."

Read the Swahili line to the caregiver. Say it is a fixed draft, checked by a speaker, not text the model wrote.

Point at the SMS ID, `CP-1042`. "That ID is what goes to a basic phone. The QR is the same passport, six fields, no name and no PIN."

Tap **Read this code**. The scan finds that same ID.

Tap **Save on this phone**. Set a PIN. Lock. Open History, enter a wrong PIN, and show that the list stays locked. Enter the right PIN. Mark the referral **Arrived**.

Open the outbox. "Queued on this phone. Not sent." Mark shown. Say again that nothing left the phone.

## 3:10 Where it sits in the day

The worker keeps the phone. The caregiver may only have a basic phone, so they leave with the spoken line and the SMS ID. The next clinic scans the code and sees the decision, the reason, and the destination. The full note stays encrypted on the first phone.

## 3:40 Stack, this layer

Browser only. The QR is drawn on the page. Records use WebCrypto and IndexedDB. There is no DHIS2 upload in this build.

## 4:00 What localizing means here

[Team] The caregiver hears Swahili. The worker sees the reason in the language of the protocol card. A language we support less well is a gap we measure, not a gap we hide.

## Say out loud

- Swahili lines are drafts until a speaker signs them.
- The breath counter and the rules were not validated on sick children.
- The passport is readable. The chart note is not, without the PIN.
