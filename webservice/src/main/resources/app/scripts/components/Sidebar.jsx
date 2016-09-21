import React, {Component} from 'react';
import {Link} from 'react-router'
import state from '../app_state';
import {observer} from 'mobx-react';

@observer
export default class Sidebar extends Component {
	render() {
		let {show, activeItem} = state.sidebar;
		return (
			<div className={show ? "enabled left-sidebar" : "left-sidebar"} ref="sidebar">
				<h4 className="sidebar-title">Registry Services</h4>
				<ul className="sibebar-nav">
					<li><Link to="/parser-registry" className={activeItem == 'Parser Registry' ? 'active' : ''}><i className="fa fa-file-code-o"></i> Parser Registry</Link></li>
					<li><Link to="/schema-registry" className={activeItem == 'Schema Registry' ? 'active' : ''}><i className="fa fa-file-code-o"></i> Schema Registry</Link></li>
					<li><Link to="/device-registry" className={activeItem == 'Device Registry' ? 'active' : ''}><i className="fa fa-tablet"></i> Device Registry</Link></li>
				</ul>
				<h4 className="sidebar-title">Streams</h4>
				<ul className="sibebar-nav">
					<li><Link to="/metrics" className={activeItem == 'Metrics' ? 'active' : ''}><i className="fa fa-tachometer"></i> Metrics</Link></li>
					<li><Link to="/topology-listing" className={activeItem == 'Topology Listing' ? 'active' : ''}><i className="fa fa-sitemap"></i> Topology Listing</Link></li>
				</ul>
			</div>
		);
	}
}