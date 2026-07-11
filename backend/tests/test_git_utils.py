import pytest
from core.git_utils import parse_github_url, InvalidUrlError

def test_parse_github_url():
    owner, repo = parse_github_url("https://github.com/encode/starlette")
    assert owner == "encode"
    assert repo == "starlette"
    
    owner, repo = parse_github_url("https://github.com/pallets/click.git")
    assert owner == "pallets"
    assert repo == "click"

def test_parse_github_url_invalid():
    with pytest.raises(InvalidUrlError):
        parse_github_url("https://gitlab.com/encode/starlette")
        
    with pytest.raises(InvalidUrlError):
        parse_github_url("https://github.com/encode/")
        
    with pytest.raises(InvalidUrlError):
        parse_github_url("https://github.com/encode/repo/something")
