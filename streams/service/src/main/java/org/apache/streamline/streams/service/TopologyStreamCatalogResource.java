/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.streamline.streams.service;

import com.codahale.metrics.annotation.Timed;
import org.apache.streamline.common.QueryParam;
import org.apache.streamline.common.util.WSUtils;
import org.apache.streamline.streams.catalog.StreamInfo;
import org.apache.streamline.streams.catalog.service.StreamCatalogService;

import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.util.Collection;
import java.util.List;

import static org.apache.streamline.common.catalog.CatalogResponse.ResponseMessage.ENTITY_NOT_FOUND;
import static org.apache.streamline.common.catalog.CatalogResponse.ResponseMessage.ENTITY_NOT_FOUND_FOR_FILTER;
import static org.apache.streamline.common.catalog.CatalogResponse.ResponseMessage.EXCEPTION;
import static org.apache.streamline.common.catalog.CatalogResponse.ResponseMessage.SUCCESS;
import static javax.ws.rs.core.Response.Status.CREATED;
import static javax.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR;
import static javax.ws.rs.core.Response.Status.NOT_FOUND;
import static javax.ws.rs.core.Response.Status.OK;
import static org.apache.streamline.common.util.WSUtils.buildTopologyIdAndVersionIdAwareQueryParams;

/**
 * Represents output stream from a source or a processor component
 * in an StreamlineTopology
 */
@Path("/v1/catalog")
@Produces(MediaType.APPLICATION_JSON)
public class TopologyStreamCatalogResource {
    private final StreamCatalogService catalogService;

    public TopologyStreamCatalogResource(StreamCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    /**
     * <p>
     * Lists all the streams in the topology or the ones matching specific query params. For example to
     * list all the streams in the topology,
     * </p>
     * <b>GET /api/v1/catalog/topologies/:TOPOLOGY_ID/streams</b>
     * <p>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entities": [
     *     {
     *       "id": 1,
     *       "topologyId": 1,
     *       "streamId": "default",
     *       "fields": [
     *         {"name": "f1", "type": "STRING", "optional": false},
     *         {"name": "f2", "type": "LONG", "optional": false}
     *       ],
     *       "timestamp": 1463238366216
     *     },
     *     {
     *     ..
     *     ..
     *     }
     *   ]
     * }
     * </pre>
     */
    @GET
    @Path("/topologies/{topologyId}/streams")
    @Timed
    public Response listStreamInfos(@PathParam("topologyId") Long topologyId, @Context UriInfo uriInfo) {
        return listTopologyStreams(
                buildTopologyIdAndVersionIdAwareQueryParams(
                        topologyId,
                        catalogService.getCurrentTopologyVersionId(topologyId),
                        uriInfo));
    }

    @GET
    @Path("/topologies/{topologyId}/versions/{versionId}/streams")
    @Timed
    public Response listStreamInfosForVersion(@PathParam("topologyId") Long topologyId,
                                                  @PathParam("versionId") Long versionId,
                                                  @Context UriInfo uriInfo) {
        return listTopologyStreams(
                buildTopologyIdAndVersionIdAwareQueryParams(topologyId,
                        versionId,
                        uriInfo));
    }

    private Response listTopologyStreams(List<QueryParam> queryParams) {
        try {
            Collection<StreamInfo> sources = catalogService.listStreamInfos(queryParams);
            if (sources != null) {
                return WSUtils.respond(sources, OK, SUCCESS);
            }
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
        return WSUtils.respond(NOT_FOUND, ENTITY_NOT_FOUND_FOR_FILTER, queryParams.toString());
    }


    /**
     * <p>
     * Gets the 'CURRENT' version of specific stream by Id. For example,
     * </p>
     * <b>GET /api/v1/catalog/topologies/:TOPOLOGY_ID/streams/:STREAM_ID</b>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "topologyId": 1,
     *     "streamId": "a",
     *     "fields": [
     *       {"name": "f1", "type": "STRING", "optional": false},
     *       {"name": "f2", "type": "LONG", "optional": false}
     *       ],
     *     "timestamp": 1463238366216
     *   }
     * }
     * </pre>
     *
     * @param streamId the stream id
     * @return the response
     */
    @GET
    @Path("/topologies/{topologyId}/streams/{id}")
    @Timed
    public Response getStreamInfoById(@PathParam("topologyId") Long topologyId, @PathParam("id") Long streamId) {
        try {
            StreamInfo streamInfo = catalogService.getStreamInfo(topologyId, streamId);
            if (streamInfo != null) {
                return WSUtils.respond(streamInfo, OK, SUCCESS);
            }
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
        return WSUtils.respond(NOT_FOUND, ENTITY_NOT_FOUND, streamId.toString());
    }

    @GET
    @Path("/topologies/{topologyId}/versions/{versionId}/streams/{id}")
    @Timed
    public Response getStreamInfoById(@PathParam("topologyId") Long topologyId,
                                      @PathParam("versionId") Long versionId,
                                      @PathParam("id") Long streamId) {
        try {
            StreamInfo streamInfo = catalogService.getStreamInfo(topologyId, streamId, versionId);
            if (streamInfo != null) {
                return WSUtils.respond(streamInfo, OK, SUCCESS);
            }
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
        return WSUtils.respond(NOT_FOUND, ENTITY_NOT_FOUND, streamId.toString());
    }

    /**
     * <p>
     * Creates a stream. For example,
     * </p>
     * <b>POST /api/v1/catalog/topologies/:TOPOLOGY_ID/streams</b>
     * <pre>
     * {
     *   "streamId": "default",
     *   "fields": [
     *     {"name": "f1", "type": "STRING"},
     *     {"name": "f2", "type": "LONG"}
     *   ]
     * }
     * </pre>
     * <i>Sample success response: </i>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "streamId": "default",
     *     "topologyId": 1,
     *     "fields": [
     *       {
     *         "name": "f1",
     *         "type": "STRING",
     *         "optional": false
     *       },
     *       {
     *         "name": "f2",
     *         "type": "LONG",
     *         "optional": false
     *       }
     *     ],
     *     "timestamp": 1463238366216
     *   }
     * }
     * </pre>
     */
    @POST
    @Path("/topologies/{topologyId}/streams")
    @Timed
    public Response addStreamInfo(@PathParam("topologyId") Long topologyId, StreamInfo streamInfo) {
        try {
            StreamInfo createdStream = catalogService.addStreamInfo(topologyId, streamInfo);
            return WSUtils.respond(createdStream, CREATED, SUCCESS);
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
    }

    /**
     * <p>Updates a stream in the topology.</p>
     * <p>
     * <b>PUT /api/v1/catalog/topologies/:TOPOLOGY_ID/streams/:STREAM_ID</b>
     * <pre>
     * {
     *   "streamId": "default",
     *   "topologyId": 1,
     *   "fields": [
     *     {"name": "f1", "type": "STRING"},
     *     {"name": "f2", "type": "LONG"},
     *     {"name": "f3", "type": "STRING"}
     *   ]
     * }
     * </pre>
     * <i>Sample success response: </i>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "streamId": "default",
     *     "topologyId": 1,
     *     "fields": [
     *       {
     *         "name": "f1",
     *         "type": "STRING",
     *         "optional": false
     *       },
     *       {
     *         "name": "f2",
     *         "type": "LONG",
     *         "optional": false
     *       },
     *       {
     *         "name": "f3",
     *         "type": "STRING",
     *         "optional": false
     *       }
     *     ],
     *     "timestamp": 1463238891203
     *   }
     * }
     * </pre>
     *
     * @param id  the id of the stream to be updated
     * @param streamInfo the updated StreamInfo object
     * @return the response
     */
    @PUT
    @Path("/topologies/{topologyId}/streams/{id}")
    @Timed
    public Response addOrUpdateStreamInfo(@PathParam("topologyId") Long topologyId, @PathParam("id") Long id, StreamInfo streamInfo) {
        try {
            StreamInfo newStreamInfo = catalogService.addOrUpdateStreamInfo(topologyId, id, streamInfo);
            return WSUtils.respond(newStreamInfo, OK, SUCCESS);
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
    }

    /**
     * <p>
     * Removes a stream resource.
     * </p>
     * <b>DELETE /api/v1/catalog/topologies/:TOPOLOGY_ID/streams/:STREAM_ID</b>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "streamId": "default",
     *     "topologyId": 1,
     *     "fields": [
     *       {
     *         "name": "f1",
     *         "type": "STRING",
     *         "optional": false
     *       },
     *       {
     *         "name": "f2",
     *         "type": "LONG",
     *         "optional": false
     *       }
     *     ],
     *     "timestamp": 1463238609751
     *   }
     * }
     * </pre>
     */
    @DELETE
    @Path("/topologies/{topologyId}/streams/{id}")
    @Timed
    public Response removeStreamInfo(@PathParam("topologyId") Long topologyId, @PathParam("id") Long id) {
        try {
            StreamInfo removedStream = catalogService.removeStreamInfo(topologyId, id);
            if (removedStream != null) {
                return WSUtils.respond(removedStream, OK, SUCCESS);
            } else {
                return WSUtils.respond(NOT_FOUND, ENTITY_NOT_FOUND, id.toString());
            }
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }

    }
}
