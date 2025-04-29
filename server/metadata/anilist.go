package metadata

import (
	"context"
	"net/http"
	"strings"

	htmltomarkdown "github.com/JohannesKaufmann/html-to-markdown/v2"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/services/anilist"
	"github.com/abibby/salusa/extra/sets"
)

type AnilistMetaProvider struct {
	anilist *anilist.Client
}

func NewAnilistMetaProvider() *AnilistMetaProvider {
	return &AnilistMetaProvider{
		anilist: anilist.NewClient(http.DefaultClient),
	}
}

var _ MetaProvider = (*AnilistMetaProvider)(nil)

// GetSeries implements MetaProvider.
func (a *AnilistMetaProvider) GetSeries(ctx context.Context, metaID *models.MetadataID) (SeriesMetadata, error) {
	service, id := metaID.IntID()
	if service != models.MetadataServiceAnilist {
		return SeriesMetadata{}, ErrWrongService
	}
	resp, err := a.anilist.Search(ctx, "", id)
	if err != nil {
		return SeriesMetadata{}, err
	}

	if len(resp.Page.Media) == 0 {
		return SeriesMetadata{}, ErrNotFound
	}

	return anilistSeriesMetadata(&resp.Page.Media[0], ""), nil
}

// SearchSeries implements MetaProvider.
func (a *AnilistMetaProvider) SearchSeries(ctx context.Context, rawName string) ([]DistanceMetadata, error) {
	resp, err := a.anilist.Search(ctx, rawName, 0)
	if err != nil {
		return nil, err
	}

	name := normalize(rawName)

	results := make([]DistanceMetadata, len(resp.Page.Media))
	for i, media := range resp.Page.Media {
		results[i] = anilistSeriesMetadata(&media, name).WithDistance(rawName)
	}

	return results, nil
}

func anilistStaffRoles(staffRole string) []StaffRole {
	staffRoleLower := strings.ToLower(staffRole)
	roles := []StaffRole{}
	if strings.Contains(staffRoleLower, "story") {
		roles = append(roles, RoleWriter)
	}
	if strings.Contains(staffRoleLower, "art") {
		roles = append(roles, RoleArtist)
	}
	if strings.Contains(staffRoleLower, "editor") {
		roles = append(roles, RoleEditor)
	}
	if strings.Contains(staffRoleLower, "translator") {
		roles = append(roles, RoleTranslator)
	}
	if strings.Contains(staffRoleLower, "assistant") {
		roles = append(roles, RoleAssistant)
	}
	if strings.Contains(staffRoleLower, "lettering") {
		roles = append(roles, RoleLetterer)
	}
	return roles
}
func anilistSeriesMetadata(media *anilist.SearchPageMedia, name string) SeriesMetadata {
	titleSet := sets.NewSliceSet[string]()
	titleSet.Add(media.Title.English, media.Title.Romaji)
	titleSet.Add(media.Synonyms...)
	titleSet.Delete("")
	titles := make([]string, 0, titleSet.Len())
	for title := range titleSet.All() {
		titles = append(titles, title)
	}

	tags := make([]string, len(media.Tags))
	for i, tag := range media.Tags {
		tags[i] = tag.Name
	}

	staff := make([]Staff, 0, len(media.Staff.Edges))
	for _, staffMember := range media.Staff.Edges {
		for _, role := range anilistStaffRoles(staffMember.Role) {
			staff = append(staff, Staff{
				Name: staffMember.Node.Name.Full,
				Role: role,
			})
		}
	}

	description := ""
	mdDisc, err := htmltomarkdown.ConvertString(media.Description)
	if err == nil {
		description = mdDisc
	}

	return SeriesMetadata{
		ID:            models.NewAnilistID(media.Id),
		Service:       models.MetadataServiceAnilist,
		Title:         titles[0],
		Aliases:       titles[1:],
		Year:          media.StartDate.Year,
		Description:   description,
		CoverImageURL: media.CoverImage.ExtraLarge,
		Genres:        media.Genres,
		Tags:          tags,
		Staff:         staff,
	}
}
