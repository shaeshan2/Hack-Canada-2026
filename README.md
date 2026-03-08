# DeedScan

**DeedScan** is a commission-free FSBO marketplace built to help Canadians buy and sell homes more directly, affordably and confidently.

Selling a home is already expensive, and traditional realtor commissions can take a huge cut out of one of the biggest financial decisions in someone’s life. DeedScan is our take on a more direct and trustworthy alternative: a platform where sellers can list homes themselves, buyers can browse with more context and both sides can interact through verification, fraud prevention and role-based access control.

## Elevator Pitch

DeedScan turns the classic yard sign into a commission-free digital FSBO marketplace. Buyers get neighborhood context, AI-supported insights and a faster way to discover homes, while sellers keep more control and more of their money.

## What It Does

DeedScan is designed around the real buyer and seller workflow.

### Sellers can
- Create property listings
- Upload listing details, pricing and descriptions
- Present homes without relying on traditional commission-heavy processes
- Communicate through a verified messaging flow

### Buyers can
- Browse available listings
- Open detailed property pages
- Explore neighborhood context such as nearby schools, grocery stores and public transit
- Ask questions through an AI-supported chatbot experience

### Admins can
- Review and verify activity on the platform
- Support fraud prevention and listing moderation
- Add an extra trust layer to direct buyer-seller interactions

## Trust and Safety

Because this is a direct FSBO platform, trust is a huge part of the product. We built DeedScan with multiple layers of safety in mind:

- Fraud detection checks
- Verification checks for both buyers and sellers
- Extra admin verification and moderation
- Role-based access control across different user types
- Verified messaging service for platform communication

## How We Used Sponsor Technologies

### Gemini
We used **Gemini** across core trust and discovery features in the platform.

Gemini helped power:
- Confidence scoring
- Verification support
- Fraud checks
- AI analysis
- NLP-based search
- A chatbot experience for listing-related questions

For the chatbot, we used **prompt engineering** and constrained its context to the actual listings available on our platform. That helped us reduce hallucinations and make listing-related responses more reliable.

### Auth0
We used **Auth0** for authentication and role-based access control across buyers, sellers and admins.

Once a user authenticated successfully, Auth0 issued a **JWT access token**, which let us securely identify the user and determine what they were allowed to access. This made it easier to:
- Protect routes
- Enforce permissions
- Separate buyer, seller and admin experiences
- Keep identity and access handling structured and secure

### Antigravity
We used **Antigravity** throughout the weekend as a core part of our development workflow.

It helped us with:
- New feature development
- Automated testing
- Debugging
- Faster iteration across the product

It was especially helpful for reducing repetitive manual checks and for fixing a custom issue related to rendering PDFs properly in the UI.

### Reactiv ClipKit
We also used **Reactiv ClipKit** to extend DeedScan beyond the browser and into a more real-world home-buying flow.

Using ClipKit, we built a **native iOS App Clip** that can be launched by scanning a QR code placed on a **for sale sign**, yard sign or similar listing entry point. This lets a potential buyer instantly open a lightweight DeedScan experience on their phone without needing to fully install the app first.

That makes the platform feel much more natural in the real estate context:
- See a sign
- Scan the QR code
- Instantly open the listing experience
- View property details and context right away

This was especially exciting for us because it bridges the physical and digital parts of home discovery in a very direct way.

## Tech Stack

- Next.js
- React
- TypeScript
- Prisma
- Auth0
- Gemini
- Antigravity
- Reactiv ClipKit
- SQLite

## Key Features

- Commission-free FSBO listing experience
- Buyer and seller verification
- Admin review and moderation
- AI-powered fraud and trust workflows
- NLP-based search
- AI chatbot constrained to platform listings
- Neighborhood insights
- Verified messaging flow
- iOS App Clip launch flow from QR codes on sale signs

## Challenges We Ran Into

A major challenge was making sure access control worked properly across multiple user types. We used **RBAC with Auth0** and had to make sure it aligned correctly with our **Prisma schema** so users only had access to the actions and data they were supposed to.

Another challenge was reliability in AI outputs. Since this is a housing-related platform, hallucinations would hurt trust quickly. That meant we had to spend time refining prompts and constraining context so Gemini could answer listing-related questions more reliably.

We also had the usual hackathon challenges around setup, integration, debugging and merging changes quickly as a team.

## What We Learned

We learned that for a marketplace like this, **trust is just as important as functionality**. Good UI alone is not enough. Users need to feel safe, informed and confident.

We also learned that authentication is only one part of security. The harder part is making sure permissions are enforced consistently across the app, database and admin flows.

On the AI side, we learned that getting useful outputs is not just about plugging in a model. Prompt engineering, constrained context and repeated testing matter a lot when the product depends on reliable answers.

## What's Next

We would love to continue expanding DeedScan into a more complete end-to-end platform.

Future directions include:
- Stronger fraud and verification systems
- Expanded admin review workflows
- Payments and transaction support
- Better listing customization
- More professional seller presentation tools
- Customized virtual tours
- Continued improvement of buyer-seller communication flows
