def build_avatar_url(request, user):
    if not getattr(user, "avatar", None):
        return None
    try:
        url = user.avatar.url
    except ValueError:
        return None
    return request.build_absolute_uri(url) if request else url
