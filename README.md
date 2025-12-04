# Group-07
## Team Details
- Teena (Group Leader)
- Kush Gupta
- Yati
- Ritik Saxena
- Manasvi Gupta

# Travel Planner with Itinerary + Expense Splitter  
## 1. Background  
Group trips are exciting, but the planning phase is often chaotic. Itineraries are scattered 
across WhatsApp chats, booking confirmations get lost in emails, and the most stressful 
part—splitting costs—often leads to confusion and awkwardness. There is a need for a 
unified space where friends can plan together and settle debts transparently.  
## 2. Challenge  
Develop a collaborative travel application that combines itinerary management with a robust 
expense splitter. The system should allow groups to build their schedule real-time, store 
tickets/bookings, log shared expenses on the go, and calculate exactly "who owes who" with 
the minimum number of transactions.  
## 3. User Roles & Flow  
Trip Organizer (Admin)  
● Create Trip: Sets dates, destination, and cover image.  
● Invite Friends: Generates a join link or code for group members.  
● Permissions: Manages who can edit the itinerary or just view it. ● Finalize: 
Approves suggested activities to lock the schedule.  
Group Member  
● Collaborate: Suggests places to visit or adds events to the shared timeline.  
● Upload Documents: Uploads tickets, hotel vouchers, and IDs for easy access.  
● Add Expense: Logs costs (e.g., "Dinner at Cafe", "Taxi") and selects who was 
involved.  
● View Balance: Sees a live update of their personal standing (plus or minus). ● Settle 
Up: Marks payments as sent/received to clear debts.  
## 4. Core Requirements  
### Functional  
● Collaborative Itinerary: A drag-and-drop timeline where multiple users can add/edit 
activities (similar to Google Docs for travel).  
● Expense Splitting Logic: Support for unequal splits (e.g., User A pays 70%, User B 
pays 30%) and shared costs.  
● Debt Simplification: An algorithm to minimize transfers (e.g., if A owes B $10 and B 
owes C $10, the system tells A to pay C $10 directly).  
● Voting System: Polls for group decisions (e.g., "Hotel X vs. Hotel Y").  
● Document Vault: Central storage for PDFs and images linked to specific itinerary 
days.  
### Non-Functional  
● Offline Support: The app should allow viewing the itinerary and logging expenses 
even without internet (syncing when back online).  
● Currency Conversion: Auto-convert expenses to the user's home currency if 
traveling abroad.  
● Real-Time Sync: Updates made by one user should reflect instantly for others.  
## 5. Technical Hints (Teams may choose their own stack)  
● Frontend: React Native or Flutter (essential for offline mobile capabilities).  
● Backend: Node.js or Django.  
● Database: Firebase (excellent for real-time sync) or PostgreSQL.  
● Algorithm: Implementation of a "Min-Cash Flow" or graph simplification algorithm for 
settling debts.  
● APIs: Google Places API (for location data) and OpenExchangeRates (for currency).  
## 6. Hackathon Deliverables  
● Working Prototype demonstrating:  
○ Planning Flow: Create Trip → Add Friends → Add Activity to Timeline.  
○ Expense Flow: Add Bill (Paid by X, split between Y & Z) → View Dashboard.  
○ Settlement: Show the "Simplify Debt" logic in action.  
● Algorithm Logic: A brief explanation or diagram of how the split calculation works. ● 
Offline Demo: Show the app working (viewing data) with network disconnected.

## 🏆 Judging Criteria

| Category                                | Weight |
|-----------------------------------------|--------|
| User Experience / UI (Visual appeal & ease of use) | 25%    |
| Complex Logic (Expense splitting & debt simplification) | 25%    |
| Collaboration Features (Real-time updates / voting) | 20%    |
| Utility Features (Offline mode, Document storage) | 15%    |
| Completeness (End-to-end working flow)  | 15%    |

## 8. Outcome  
A comprehensive travel companion that removes the administrative friction from group 
travel, allowing friends to focus on the experience rather than the logistics and finances.  
