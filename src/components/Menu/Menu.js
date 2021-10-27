import { withTranslation } from "react-i18next";
import { connect } from "react-redux";
import React from 'react'
import styles from './Menu.module.css'
import {
  doAssignUnit,
  doCreateUnit, doGetSchema,
  doGetSchemasNames,
  doLogout,
  doRaiseNotification,
  doSetSteps
} from "@reducers/stagesActions";
import PropTypes from "prop-types"
import { push } from "connected-react-router";
import { CircularProgress } from "@mui/material";
import { LoadingButton } from '@mui/lab'
import { withTheme } from '@mui/styles'
import config from '../../../configs/config.json'

export default withTheme(withTranslation()(connect(
  (store) => ({
    unitID: store.stages.getIn(['unit', 'unit_internal_id']),
    schemas: store.stages.get('productionSchemas').toJS(),
    authorized: store.stages.getIn(['composition', 'employee_logged_in']),
  }),
  (dispatch) => ({
    raiseNotification: (notificationMessage) => doRaiseNotification(dispatch, notificationMessage),
    createUnit: (schemaID, successChecker, errorChecker) => doCreateUnit(dispatch, schemaID, successChecker, errorChecker),
    doAssignUnit: (unit_id, successChecker, errorChecker) => doAssignUnit(dispatch, unit_id, successChecker, errorChecker),
    doGetSchemasNames: (successChecker, errorChecker) => doGetSchemasNames(dispatch, successChecker, errorChecker),
    doGetSchema: (schemaId, successChecker, errorChecker) => doGetSchema(dispatch, schemaId, successChecker, errorChecker),
    doLogout: (successChecker, errorChecker) => doLogout(dispatch, successChecker, errorChecker),
    doRedirectToComposition: () => dispatch(push('/composition')),

    setSteps: (steps) => doSetSteps(dispatch, steps)
  })
)(class Menu extends React.Component {

  static propTypes = {
    authorized: PropTypes.bool,
    unitID: PropTypes.string,
    raiseNotification: PropTypes.func.isRequired,
    doCreateUnit: PropTypes.func.isRequired,
    doLogout: PropTypes.func.isRequired
  }

  state = {
    createLoading_1: false,
    createLoading_2: false,
    logoutLoading: false,
    chooseVariantModal: 0,
    loading: [],
    selectedScheme: {}
  }

  componentDidMount () {
    // Get all schemas list with their names
    this.props.doGetSchemasNames(
      (res) => {
        if (res.status_code === 200) {
          if (res.available_schemas.length === 0 && this.props.authorized) {
            this.props.raiseNotification('Внимание! Доступно 0 сборок. Свяжитесь с администратором системы для добавления необходимых сборок в базу.')
          }
          return true
        } else {
          return false
        }
      }, null)
  }

  handleCreateUnit = (item, index) => {
    let arr    = this.state.loading
    arr[index] = true
    this.setState({loading: arr})
    this.props.doGetSchema(
      item.schema_id,
      (res) => {
        if (res.status_code === 200) {
          let schema = res.production_schema
          // Check if the whole scheme is empty
          if (schema === null) {
            this.props.raiseNotification('Ошибка. Данная схема отсутствует. Связитесь с администратором для решения данной проблемы.')
            let arr    = this.state.loading
            arr[index] = false
            this.setState({loading: arr})
            return false
          }
          // Check if this scheme has no stages at all
          if (schema.production_stages === null) {
            this.props.raiseNotification('Ошибка. Данная схема не содежит ни одного этапа. Связитесь с администратором для решения данной проблемы.')
            let arr    = this.state.loading
            arr[index] = false
            this.setState({loading: arr})
            return false
          }
          this.props.setSteps(schema.production_stages)
          this.props.createUnit(
            item.schema_id,
            (r) => {
              this.props.doAssignUnit(
                r.unit_internal_id,
                (r) => {
                  if (r.status_code === 200) {
                    if (schema?.required_components_schema_ids === null) {
                      this.props.doRedirectToComposition()
                    }
                    let arr    = this.state.loading
                    arr[index] = false
                    this.setState({loading: arr})
                    return true
                  } else {
                    let arr    = this.state.loading
                    arr[index] = false
                    this.setState({loading: arr})
                    return false
                  }
                }, null)
              return true
            }, null)
          return true
        } else {
          this.props.raiseNotification('Ошибка при получении схем сборки. Попробуйте перезагрузить страницу.')
          let arr    = this.state.loading
          arr[index] = false
          this.setState({loading: arr})
          return false
        }
      }, null)
  }

  handleUserLogout = () => {
    this.setState({logoutLoading: true})
    this.props.doLogout(
      () => {
        this.setState({logoutLoading: false})
        return true
      }, () => {
        this.setState({logoutLoading: false})
        return false
      }
    )
  }

  render () {
    const {t, schemas}                                                  = this.props
    const {createLoading_1, loading, logoutLoading, chooseVariantModal} = this.state
    return (
      <div className={styles.wrapper}>
        {chooseVariantModal === 0 && (
          <div className={styles.buttonsWrapper}>
            <div className={styles.buttons}>
              <LoadingButton
                loadingIndicator={<CircularProgress color='inherit' size={28}/>}
                loading={createLoading_1 === true}
                color="primary"
                variant="contained"
                onClick={() => {
                  this.setState({createLoading_1: true},
                    () => setTimeout(() => {
                      this.setState({chooseVariantModal: 1},
                        () => this.setState({createLoading_1: false}))
                    }, 200))
                }}
              >{t('StartComposition')}</LoadingButton>
            </div>
            <div className={styles.buttons}>
              <LoadingButton
                loadingIndicator={<CircularProgress color='inherit' size={28}/>}
                loading={logoutLoading}
                color="secondary"
                variant="outlined"
                onClick={this.handleUserLogout}
              >{t('FinishSession')}</LoadingButton>
            </div>
          </div>
        )}
        {chooseVariantModal === 1 && (<div>
          <div className={styles.header}>{t('SpecifyCompositionType')}</div>
          <div className={styles.variantsWrapper}>
            {schemas?.map((item, index) => {
              let show_flag = !item.schema_id.startsWith('test_')
              if (config.show_test_schemas && !show_flag)
                show_flag = true
              if (show_flag)
                return (
                  <div key={item.schema_id} className={styles.buttons}>
                    <LoadingButton
                      loadingIndicator={<CircularProgress color='inherit' size={28}/>}
                      loading={loading[index]}
                      color='primary'
                      variant='contained'
                      onClick={() => {
                        if (item.included_schemas !== null) {
                          this.setState({
                            selectedScheme: item,
                            chooseVariantModal: 2
                          }, () => console.log(this.state.selectedScheme))
                          // console.log('move to included schemas selecting')
                        } else {
                          this.handleCreateUnit(item, index)
                        }
                      }}
                    >{item.schema_name}</LoadingButton>
                  </div>
                )
            })}
          </div>
          <div className={styles.buttonsWrapper}>
            <div className={styles.buttons}>
              <LoadingButton
                loadingIndicator={<CircularProgress color='inherit' size={28}/>}
                loading={logoutLoading}
                color='secondary'
                variant='outlined'
                onClick={() => this.setState({chooseVariantModal: 0})}
              >{t('Back')}</LoadingButton>
            </div>
          </div>
        </div>)}
        {chooseVariantModal === 2 && (<div>
          <div className={styles.header}>{this.state.selectedScheme.schema_name}</div>
          <div className={styles.subheader}>{t('SelectOneOfTheFollowingCompositions')}</div>
          <div className={styles.schemeDetailsWrapper}>
            <div className={styles.buttons}>
              <LoadingButton
                loadingIndicator={<CircularProgress color='inherit' size={28}/>}
                loading={logoutLoading}
                color='secondary'
                variant='outlined'
                onClick={() => this.setState({chooseVariantModal: 1})}
              >{t('Back')}</LoadingButton>
            </div>
            <div>
              {this.state.selectedScheme.included_schemas.map((item, index) => {
                return (
                  <div key={item.schema_id} className={styles.buttons}>
                    <LoadingButton
                      loadingIndicator={<CircularProgress color='inherit' size={28}/>}
                      loading={loading[index]}
                      color='primary'
                      variant='contained'
                      onClick={() => {
                        this.handleCreateUnit(item, index)
                      }}
                    >{item.schema_name}</LoadingButton>
                  </div>
                )
              })}
            </div>
            <div className={styles.buttons}>
              <LoadingButton
                loadingIndicator={<CircularProgress color='inherit' size={28}/>}
                loading={loading[this.state.selectedScheme.included_schemas.length + 1]}
                color='primary'
                variant='outlined'
                onClick={() => this.handleCreateUnit(
                  this.state.selectedScheme,
                  this.state.selectedScheme.included_schemas.length + 1)
                }
              >{t('FinishingSteps')}</LoadingButton>
            </div>
          </div>
        </div>)}

      </div>
    )
  }
})))
