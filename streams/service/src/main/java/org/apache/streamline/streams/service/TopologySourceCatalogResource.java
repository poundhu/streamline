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
import org.apache.streamline.streams.catalog.TopologySource;
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
 * Source component within an StreamlineTopology
 */
@Path("/v1/catalog")
@Produces(MediaType.APPLICATION_JSON)
public class TopologySourceCatalogResource {
    private final StreamCatalogService catalogService;

    public TopologySourceCatalogResource(StreamCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    /**
     * <p>
     * Lists all the sources in the topology or the ones matching specific query params. For example to
     * list all the sources in the topology,
     * </p>
     * <b>GET /api/v1/catalog/topologies/:TOPOLOGY_ID/sources</b>
     * <p>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entities": [{
     *     "id": 1,
     *     "topologyId": 1,
     *     "name": "kafkaDataSource",
     *     "config": {
     *       "properties": {
     *         "zkUrl": "localhost:2181",
     *         "zkPath": "/brokers",
     *         "refreshFreqSecs": 60
     *       }
     *     },
     *     "type": "KAFKA",
     *     "outputStreams": [{stream1 data..}, {stream2 data..}]
     *   }]
     * }
     * </pre>
     */
    @GET
    @Path("/topologies/{topologyId}/sources")
    @Timed
    public Response listTopologySources(@PathParam("topologyId") Long topologyId, @Context UriInfo uriInfo) {
        Long currentVersionId = catalogService.getCurrentTopologyVersionId(topologyId);
        return listTopologySources(
                buildTopologyIdAndVersionIdAwareQueryParams(topologyId, currentVersionId, uriInfo));
    }

    @GET
    @Path("/topologies/{topologyId}/versions/{versionId}/sources")
    @Timed
    public Response listTopologySourcesForVersion(@PathParam("topologyId") Long topologyId,
                                                  @PathParam("versionId") Long versionId,
                                                  @Context UriInfo uriInfo) {
        return listTopologySources(
                buildTopologyIdAndVersionIdAwareQueryParams(topologyId, versionId, uriInfo));
    }

    private Response listTopologySources(List<QueryParam> queryParams) {
        try {
            Collection<TopologySource> sources = catalogService.listTopologySources(queryParams);
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
     * Gets the 'CURRENT' version of specific topology source by Id. For example,
     * </p>
     * <b>GET /api/v1/catalog/topologies/:TOPOLOGY_ID/sources/:SOURCE_ID</b>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "topologyId": 1,
     *     "name": "kafkaDataSource",
     *     "config": {
     *       "properties": {
     *         "zkUrl": "localhost:2181",
     *         "zkPath": "/brokers",
     *         "refreshFreqSecs": 60
     *       }
     *     },
     *     "type": "KAFKA",
     *     "outputStreams": [{stream1 data..}, {stream2 data..}]
     *   }
     * }
     * </pre>
     */
    @GET
    @Path("/topologies/{topologyId}/sources/{id}")
    @Timed
    public Response getTopologySourceById(@PathParam("topologyId") Long topologyId, @PathParam("id") Long sourceId) {
        try {
            TopologySource source = catalogService.getTopologySource(topologyId, sourceId);
            if (source != null) {
                return WSUtils.respond(source, OK, SUCCESS);
            }
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
        return WSUtils.respond(NOT_FOUND, ENTITY_NOT_FOUND, buildMessageForCompositeId(topologyId, sourceId));
    }

    @GET
    @Path("/topologies/{topologyId}/versions/{versionId}/sources/{id}")
    @Timed
    public Response getTopologySourceByIdAndVersion(@PathParam("topologyId") Long topologyId,
                                                    @PathParam("id") Long sourceId,
                                                    @PathParam("versionId") Long versionId) {
        try {
            TopologySource source = catalogService.getTopologySource(topologyId, sourceId, versionId);
            if (source != null) {
                return WSUtils.respond(source, OK, SUCCESS);
            }
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
        return WSUtils.respond(NOT_FOUND, ENTITY_NOT_FOUND, buildMessageForCompositeId(topologyId, sourceId));
    }

    /**
     * <p>
     * Creates a topology source. For example,
     * </p>
     * <b>POST /api/v1/catalog/topologies/:TOPOLOGY_ID/sources</b>
     * <pre>
     * {
     *   "name": "kafkaDataSource",
     *   "config": {
     *     "properties": {
     *       "zkUrl": "localhost:2181",
     *       "zkPath": "/brokers",
     *       "refreshFreqSecs": 60
     *     }
     *   },
     *   "type": "KAFKA",
     *
     *   "outputStreamIds": [1]
     *   OR
     *   "outputStreams" : [{stream1 data..}, {stream2 data..}]
     * }
     * </pre>
     * <i>Sample success response: </i>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "topologyId": 1,
     *     "name": "kafkaDataSource",
     *     "config": {
     *       "properties": {
     *         "zkUrl": "localhost:2181",
     *         "zkPath": "/brokers",
     *         "refreshFreqSecs": 60
     *       }
     *     },
     *     "type": "KAFKA",
     *     "outputStreamIds": [1] OR "outputStreams" : {..}
     *   }
     * }
     * </pre>
     */
    @POST
    @Path("/topologies/{topologyId}/sources")
    @Timed
    public Response addTopologySource(@PathParam("topologyId") Long topologyId, TopologySource topologySource) {
        try {
            TopologySource createdSource = catalogService.addTopologySource(topologyId, topologySource);
            return WSUtils.respond(createdSource, CREATED, SUCCESS);
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
    }

    /**
     * <p>Updates a topology source.</p>
     * <p>
     * <b>PUT /api/v1/catalog/topologies/:TOPOLOGY_ID/sources/:SOURCE_ID</b>
     * <pre>
     * {
     *   "name": "kafkaDataSource",
     *   "config": {
     *     "properties": {
     *       "zkUrl": "localhost:2181",
     *       "zkPath": "/brokers",
     *       "refreshFreqSecs": 120
     *     }
     *   },
     *   "type": "KAFKA",
     *   "outputStreamIds": [1]
     * }
     * </pre>
     * <i>Sample success response: </i>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "topologyId": 1,
     *     "name": "kafkaDataSource",
     *     "config": {
     *       "properties": {
     *         "zkUrl": "localhost:2181",
     *         "zkPath": "/brokers",
     *         "refreshFreqSecs": 120
     *       }
     *     },
     *     "type": "KAFKA",
     *     "outputStreamIds": [1]
     *   }
     * }
     * </pre>
     */
    @PUT
    @Path("/topologies/{topologyId}/sources/{id}")
    @Timed
    public Response addOrUpdateTopologySource(@PathParam("topologyId") Long topologyId, @PathParam("id") Long sourceId,
                                              TopologySource topologySource) {
        try {
            TopologySource createdTopologySource = catalogService.addOrUpdateTopologySource(topologyId, sourceId, topologySource);
            return WSUtils.respond(createdTopologySource, CREATED, SUCCESS);
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
    }

    /**
     * <p>
     * Removes a topology source.
     * </p>
     * <b>DELETE /api/v1/catalog/topologies/:TOPOLOGY_ID/sources/:SOURCE_ID</b>
     * <pre>
     * {
     *   "responseCode": 1000,
     *   "responseMessage": "Success",
     *   "entity": {
     *     "id": 1,
     *     "topologyId": 1,
     *     "name": "kafkaDataSource",
     *     "config": {
     *       "properties": {
     *         "zkUrl": "localhost:2181",
     *         "zkPath": "/brokers",
     *         "refreshFreqSecs": 60
     *       }
     *     },
     *     "type": "KAFKA",
     *     "outputStreams": [{stream1 data..}, {stream2 data..}]
     *   }
     * }
     * </pre>
     */
    @DELETE
    @Path("/topologies/{topologyId}/sources/{id}")
    @Timed
    public Response removeTopologySource(@PathParam("topologyId") Long topologyId, @PathParam("id") Long sourceId) {
        try {
            TopologySource topologySource = catalogService.removeTopologySource(topologyId, sourceId);
            if (topologySource != null) {
                return WSUtils.respond(topologySource, OK, SUCCESS);
            } else {
                return WSUtils.respond(NOT_FOUND, ENTITY_NOT_FOUND, sourceId.toString());
            }
        } catch (Exception ex) {
            return WSUtils.respond(INTERNAL_SERVER_ERROR, EXCEPTION, ex.getMessage());
        }
    }

    private String buildMessageForCompositeId(Long topologyId, Long sourceId) {
        return String.format("topology id <%d>, source id <%d>", topologyId, sourceId);
    }
}
