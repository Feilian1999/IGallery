using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Models;
using WebApplication1.Services;

// For more information on enabling MVC for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApplication1.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class TokenController : Controller
    {
        private readonly DBContext _db;
        private readonly IArtistService _artistService;
        private readonly IGetTokenService _tokenService;
        private readonly IGetIgDataService _igService;
        public TokenController(DBContext db,
            IArtistService artistService,
            IGetTokenService tokenService,
            IGetIgDataService igService
        )
        {
            _db = db ?? throw new ArgumentNullException(nameof(db));
            _artistService = artistService;
            _tokenService = tokenService;
            _igService = igService;
        }

        /// <summary>
        /// New Artist Add to IGallery
        /// </summary>
        /// <returns></returns>
        [HttpPost("[action]")]
        public async Task<IActionResult> AddNewArtist([FromBody] OAuthToTokenRq rq)
        {
            var code = rq.Code;
            var tempToken = await _tokenService.GetToken(code).ConfigureAwait(false);
            var extToken = await _tokenService.ExtendToken(tempToken.Access_token);
            var artistInfo = await _igService.GetArtistInfo(tempToken.User_id, extToken.access_token);

            var tobeAddArtist = new Artist { ArtistName = artistInfo.Username };
            var result = _artistService.AddArtist(tobeAddArtist);
            var artist = _db.Artists
                .Select(artist => new Artist { ArtistId = artist.ArtistId, ArtistName = artist.ArtistName })
                .Where(artist => artist.ArtistName == artistInfo.Username);
            var newToken = new Token
            {
                AccessToken = extToken.access_token,
                ArtistId = artist.First().ArtistId,
                CreateTime = DateTime.Now,
                UpdateTime = DateTime.Now,
                ExpireTime = DateTime.Now.AddSeconds((double)extToken.expires_in),
                Artist = artist.First(),
            };

            var addTokenRes = _db.Tokens.Add(newToken);
            var finalRes = _db.SaveChanges();
            return Ok("successfully add artist and Generate 60 day token number: " + extToken.access_token);
        }

         
    }
}

