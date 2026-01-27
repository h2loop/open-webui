import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from open_webui.internal.db import get_db
from open_webui.models.users import Users

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python update_role.py <email> <role>")
        print("Example: python update_role.py user@example.com admin")
        sys.exit(1)

    email = sys.argv[1]
    role = sys.argv[2]

    with get_db() as db:
        user = Users.get_user_by_email(email)
        if user:
            updated_user = Users.update_user_by_id(user.id, {"role": role})
            if updated_user:
                print(f"Successfully updated role for {email} to {role}")
            else:
                print(f"Failed to update role for {email}")
        else:
            print(f"User with email {email} not found")
