import os
import sys

# Add project root to python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from database.postgresql.connection import get_session
from database.postgresql.models import RoleReference
from backend.app.core.roles_mapping import FRONTEND_TO_BACKEND_ROLE

DATA_TO_SEED = [
  {
    "role": "Content Creator",
    "description": "Individual users who create, manage, and publish content across connected social media platforms.",
    "keyResponsibilities": [
      "Create and edit social media posts",
      "Save and manage draft content",
      "Schedule posts for future publishing",
      "Create recurring posts for regular campaigns",
      "Upload and manage media assets",
      "Track post performance and engagement metrics",
      "View publishing history and status logs",
      "Manage connected social media accounts",
      "Monitor scheduled and published content",
      "Access personal analytics and reports"
    ]
  },
  {
    "role": "Marketing Team",
    "description": "Team members collaborating on marketing campaigns and social media management.",
    "keyResponsibilities": [
      "Collaborate on campaign planning and execution",
      "Create and manage campaign content",
      "Review and approve scheduled posts",
      "Coordinate publishing across multiple channels",
      "Manage campaign calendars and timelines",
      "Track campaign performance metrics",
      "Monitor audience engagement and trends",
      "Manage shared content drafts",
      "Generate campaign reports",
      "Collaborate with content creators and business users"
    ]
  },
  {
    "role": "Business User",
    "description": "Organizations and businesses managing multiple brands, teams, and social media accounts.",
    "keyResponsibilities": [
      "Manage multiple social media accounts",
      "Oversee brand campaigns and marketing strategies",
      "Manage team members and permissions",
      "Access business analytics dashboards",
      "Monitor publishing activities across accounts",
      "Review campaign performance reports",
      "Manage social media integrations",
      "Approve content before publishing",
      "Track ROI and engagement metrics",
      "Ensure brand consistency across platforms"
    ]
  },
  {
    "role": "Administrator",
    "description": "Platform administrators responsible for system management, security, and monitoring.",
    "keyResponsibilities": [
      "Manage users and role assignments",
      "Configure system settings and platform preferences",
      "Monitor platform health and performance",
      "Manage security policies and access control",
      "Review system activity logs",
      "Monitor publishing queues and background services",
      "Generate platform-wide reports",
      "Handle user support and issue resolution",
      "Manage social media API configurations",
      "Ensure compliance, security, and data integrity"
    ]
  }
]


def seed_roles():
    session = get_session()
    try:
        print("Starting role_reference database seeding...")
        for item in DATA_TO_SEED:
            role_label = item["role"]
            description = item["description"]
            key_resp = item["keyResponsibilities"]
            maps_to = FRONTEND_TO_BACKEND_ROLE.get(role_label)

            # Query to check if the record exists
            existing = session.query(RoleReference).filter_by(role_label=role_label).first()
            if existing:
                print(f"Updating existing role: {role_label}")
                existing.description = description
                existing.key_responsibilities = key_resp
                existing.maps_to_auth_role = maps_to
            else:
                print(f"Inserting new role: {role_label}")
                new_role = RoleReference(
                    role_label=role_label,
                    description=description,
                    key_responsibilities=key_resp,
                    maps_to_auth_role=maps_to
                )
                session.add(new_role)
        
        session.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        session.rollback()
        print(f"Error during seeding: {e}", file=sys.stderr)
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    seed_roles()
