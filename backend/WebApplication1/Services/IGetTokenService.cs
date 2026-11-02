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
        /// <summary>
        /// 延長Token至60天
        /// </summary>
        /// <param name="accessToken">短期的一小時版Token</param>
        /// <returns> IExtendToken Object</returns>
        public Task<ExtendTokenRs> ExtendToken(string accessToken);
    }
}
