using System;
using WebApplication1.Models;
namespace WebApplication1.Services
{
    public interface IGetTokenService
    {
        /// <summary>
        /// get access Token
        /// </summary>
        /// <param name="oauthToken">oauth token on the url</param>
        /// <returns>access token and user id</returns>
        public Task<GetTokenRs> GetToken(string oauthToken);
    }
}
