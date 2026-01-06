from django.contrib import admin
from .models import Team, TeamMember, TeamPost

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'invite_code', 'owner', 'created_at')
    search_fields = ('name', 'invite_code')

@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('team', 'user', 'role', 'joined_at')
    list_filter = ('role', 'team')

@admin.register(TeamPost)
class TeamPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'team', 'author', 'created_at')