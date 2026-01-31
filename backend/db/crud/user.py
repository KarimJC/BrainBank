
#placeholder mock functions 
def create_user(user_data, db):
    return {
        "user_id": 1,
        "neu_email": user_data.neu_email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "profile_picture": user_data.profile_picture
    }


def get_user_by_id(user_id: int, db) :
    if user_id == 1:
        return {
            "user_id": 1,
            "neu_email": "test@northeastern.edu",
            "first_name": "Test",
            "last_name": "User",
            "profile_picture": None
        }
    return None


def update_user(user_id: int, user_data, db):
    return {
        "user_id": user_id,
        "neu_email": "updated@northeastern.edu",
        "first_name": user_data.first_name or "Updated",
        "last_name": user_data.last_name or "User",
        "profile_picture": user_data.profile_picture
    }


def delete_user(user_id: int, db):
    return True


def check_email_exists(email: str, db):
    return email == "taken@northeastern.edu"