# backend/utils/github_scraper.py

import requests
import re
from urllib.parse import urlparse

def extract_comments(github_url):
    """
    Extract comments from a GitHub issue URL
    Returns tuple: (issue_title, comments_list)
    """
    try:
        print(f"🔍 Starting to extract comments from: {github_url}")
        
        # Parse GitHub URL to get owner, repo, and issue number
        parsed_url = urlparse(github_url)
        path_parts = parsed_url.path.strip('/').split('/')
        
        if len(path_parts) < 4 or path_parts[2] != 'issues':
            raise ValueError("Invalid GitHub issue URL format. Expected: https://github.com/owner/repo/issues/number")
        
        owner = path_parts[0]
        repo = path_parts[1]
        issue_number = path_parts[3]
        
        print(f"📋 Parsed URL - Owner: {owner}, Repo: {repo}, Issue: {issue_number}")
        
        # GitHub API endpoints
        issue_api_url = f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}"
        comments_api_url = f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}/comments"
        
        # Headers for GitHub API (you can add token here if needed)
        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Issue-Classifier'
        }
        
        # Get issue details
        print(f"📥 Fetching issue details...")
        issue_response = requests.get(issue_api_url, headers=headers)
        
        if issue_response.status_code == 404:
            raise ValueError(f"Issue not found. Please check if the URL is correct: {github_url}")
        elif issue_response.status_code != 200:
            raise ValueError(f"Failed to fetch issue details. Status code: {issue_response.status_code}")
        
        issue_data = issue_response.json()
        issue_title = issue_data.get('title', 'Unknown Title')
        issue_body = issue_data.get('body', '')
        issue_author = issue_data.get('user', {}).get('login', 'unknown')
        
        print(f"✅ Issue found: {issue_title}")
        
        # Get comments
        print(f"📥 Fetching comments...")
        comments_response = requests.get(comments_api_url, headers=headers)
        
        if comments_response.status_code != 200:
            print(f"⚠️ Failed to fetch comments. Status code: {comments_response.status_code}")
            comments_data = []
        else:
            comments_data = comments_response.json()
        
        # Prepare comments list
        comments_list = []
        
        # Add the original issue body as the first "comment" if it exists
        if issue_body and issue_body.strip():
            comments_list.append({
                "comment": issue_body.strip(),
                "author": issue_author,
                "issue_number": issue_number
            })
            print(f"✅ Added issue body from {issue_author}")
        
        # Add all comments
        for comment in comments_data:
            comment_body = comment.get('body', '').strip()
            comment_author = comment.get('user', {}).get('login', 'unknown')
            
            if comment_body:  # Only add non-empty comments
                comments_list.append({
                    "comment": comment_body,
                    "author": comment_author,
                    "issue_number": issue_number
                })
                print(f"✅ Added comment from {comment_author}")
        
        print(f"🎯 Total comments extracted: {len(comments_list)}")
        
        if len(comments_list) == 0:
            print("⚠️ No comments found in this issue")
        
        return issue_title, comments_list
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error while fetching from GitHub: {str(e)}")
        raise RuntimeError(f"Network error: {str(e)}")
    except ValueError as e:
        print(f"❌ Value error: {str(e)}")
        raise ValueError(str(e))
    except Exception as e:
        print(f"❌ Unexpected error in extract_comments: {str(e)}")
        raise RuntimeError(f"Unexpected error: {str(e)}")