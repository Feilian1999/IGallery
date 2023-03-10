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
    public class InstagramController : Controller
    {
        // 裝 serivces
        private readonly IGetIgDataService _getIgDataService;
        private readonly IGetTokenService _getTokenService;
        private readonly IExtendTokenService _extendTokenService;

        // DI 注入
        public InstagramController(IGetIgDataService getIgdataService, IGetTokenService getTokenService, IExtendTokenService extendTokenService)
        {
            _getIgDataService = getIgdataService;
            _getTokenService = getTokenService;
            _extendTokenService = extendTokenService;
        }


        // api functions
        [HttpPost("GetIndex")]
        public IActionResult Index(string firstName, string lastName)
        {
            string response = "HI" + firstName + lastName;
            return Ok(response);
        }

        [HttpPost("GetToken")]
        public async Task<ActionResult<GetTokenRs>> OAuthtoToken([FromBody] OAuthToTokenRq rq)
        {
            var code = rq.Code;
            GetTokenRs rs = await _getTokenService.GetToken(code).ConfigureAwait(false);
            return rs;
        }

        [HttpGet("ExtendToken")]
        public async Task<ActionResult<ExtendTokenRs>> ExtendToken(String accessToken)
        {
            ExtendTokenRs rs = await _extendTokenService.ExtendTokenRs(accessToken).ConfigureAwait(false);
            return rs;
        }

        [HttpGet("IgData")]
        public async Task<ActionResult<IgData>> GetIgData([FromHeader]string authorization)
        {
            var rawRs = await _getIgDataService.GetIgData(authorization).ConfigureAwait(false);
            Action<Data> action = new Action<Data> (_GetDataIfAlbum);
            var postArr = rawRs.data;
            var organizedResponse = new IgData() { paging = rawRs.paging };
            var pInd = 0;
            var posts = new Data[postArr.Length];
            foreach(Data post in postArr)
            {
                if(post.media_type == "CAROUSEL_ALBUM")
                {
                    var idList = await _getIgDataService.GetAlbumData(post.id, authorization);
                    var albums = new PostInAlbum[idList.data.Length];
                    int index = 0;
                    foreach (AlbumId id in idList.data)
                    {
                        var album = await _getIgDataService.GetAlbumPost(id.id, authorization);
                        albums[index] = album;
                        index++;
                    }
                    post.children = albums;
                }

                posts[pInd] = post;
                pInd++;
            }

            organizedResponse.data = posts;

            return organizedResponse;
        }

        [HttpGet("PostId")]
        public async Task<ActionResult<IgData>> GetPostId(string postId, string token)
        {
            var response = await _getIgDataService.GetAlbumPost(postId, token).ConfigureAwait(false);
            return Ok(response);
        }

        [HttpGet("AlbumId")]
        public async Task<ActionResult<IgData>> GetAlbumData(string albumId, string token)
        {
            var response = await _getIgDataService.GetAlbumData(albumId, token).ConfigureAwait(false);
            return Ok(response);
        }

        private static void _GetDataIfAlbum(Data data)
        {
            if(data.media_type == "CAROUSEL_ALBUM")
            {

            }
        }
    }
}

